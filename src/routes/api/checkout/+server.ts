import { json, error } from '@sveltejs/kit';
import { DRINK_CATEGORY, getDb } from '$lib/server/db';
import { getShopProduct } from '$lib/server/products';
import { createCheckoutSession } from '$lib/server/stripe';
import { SITE_URL } from '$env/static/private';
import { isValidEmail } from '$lib/server/validation';

/**
 * How long an unpaid drink hold may sit before Stripe expires the session and
 * the webhook releases the capacity. 30 minutes is Stripe's minimum.
 */
const DRINK_SESSION_EXPIRY_MINUTES = 30;

/** Attempts to link a created Stripe session to its reservation row. */
const LINK_RETRIES = 3;
import { getSettingOn, SETTINGS } from '$lib/server/db';
import {
	abandonHold,
	attachSessionToReservation,
	buildDrinkOrder,
	drinksEnabled,
	holdCapacity,
	isDateOrderable,
	refusalMessage
} from '$lib/server/reservations';

export async function POST({ request }) {
	const { items, email, name, reservationData, dropId, shippingZip } = await request.json();

	if (!items?.length) {
		throw error(400, 'Items required');
	}
	if (email && !isValidEmail(email)) {
		throw error(400, 'Invalid email format');
	}

	const db = getDb();

	// ---- Drink reservation ----
	//
	// Paid up front, pickup only, capacity measured in drinks. Deliberately a
	// branch of its own rather than a flag on the product path: the scarce
	// resource is a slot, not stock, and the failures a customer needs to see
	// (slot just filled vs ordering closed for the day) are different.
	// A half-formed reservationData used to fall through to the physical-goods
	// path, which disables shipping collection (collectShipping = !reservationData)
	// and writes no reservation — a paid order nobody knows is a pickup.
	if (reservationData && !(reservationData.date && reservationData.timeSlot)) {
		throw error(400, 'A pickup day and time are required.');
	}

	if (reservationData?.date && reservationData?.timeSlot) {
		if (!drinksEnabled(db)) throw error(403, 'Drink ordering is not available right now.');
		if (!email || !isValidEmail(email)) throw error(400, 'A valid email is required.');

		const order = buildDrinkOrder(db, items);
		if (!order.ok) throw error(400, refusalMessage(order.reason));

		const orderable = isDateOrderable(db, reservationData.date, new Date());
		if (!orderable.ok) throw error(409, refusalMessage(orderable.reason));

		const pickupLocation = getSettingOn(db, SETTINGS.drinksPickupLocation) || null;

		// Hold capacity BEFORE talking to Stripe: the slot is the scarce thing, so
		// fail fast on it rather than minting a session we might have to throw away.
		const held = holdCapacity(db, {
			date: reservationData.date,
			timeSlot: reservationData.timeSlot,
			drinkCount: order.drinkCount!,
			email,
			name: name || '',
			totalCents: order.totalCents!,
			items: JSON.stringify(order.lineItems),
			pickupLocation
		});
		if (!held.ok) throw error(409, refusalMessage(held.reason));

		const reservationId = held.reservationId!;

		// An order row keeps the admin Orders view and the webhook consistent.
		const orderRow = db
			.prepare(
				'INSERT INTO orders (customer_email, customer_name, items, total_cents, status) VALUES (?, ?, ?, ?, ?)'
			)
			.run(email, name || '', JSON.stringify(order.lineItems), order.totalCents!, 'pending');
		const drinkOrderId = orderRow.lastInsertRowid;
		db.prepare('UPDATE reservations SET order_id = ? WHERE id = ?').run(
			drinkOrderId,
			reservationId
		);

		// ONLY the Stripe call belongs in this try. Once a session exists the
		// customer can pay, so from that point on the hold must never be
		// abandoned — doing so would take money for a cancelled reservation.
		let clientSecret: string;
		let sessionId: string;
		try {
			const created = await createCheckoutSession(
				order.lineItems!,
				email,
				`${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${drinkOrderId}`,
				// Capacity is held before payment, so keep the window short: an
				// abandoned checkout must give the slot back quickly rather than
				// letting an unpaid hold block a scarce day for 24 hours.
				{ expiresInMinutes: DRINK_SESSION_EXPIRY_MINUTES }
			);
			clientSecret = created.clientSecret;
			sessionId = created.sessionId;
		} catch (e) {
			// No session exists, so nobody can ever pay for this hold. Release the
			// capacity rather than let it rot until an expiry that will never come.
			abandonHold(db, reservationId);
			db.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").run(drinkOrderId);
			console.error('Drink reservation: Stripe session creation failed', e);
			throw error(502, 'We could not start checkout. Please try again.');
		}

		// Linking the session is retried rather than compensated: the admin
		// container writes to this same file, so a transient SQLITE_BUSY here must
		// not orphan a payable session.
		let linked = false;
		for (let attempt = 0; attempt < LINK_RETRIES && !linked; attempt++) {
			try {
				attachSessionToReservation(db, reservationId, sessionId);
				db.prepare('UPDATE orders SET stripe_session_id = ? WHERE id = ?').run(
					sessionId,
					drinkOrderId
				);
				linked = true;
			} catch (e) {
				console.error(
					`Drink reservation: failed to link session (attempt ${attempt + 1}/${LINK_RETRIES})`,
					e
				);
			}
		}
		if (!linked) {
			// A payable session now exists that no row points at. The hold is left
			// in place deliberately — the customer may still pay, and the webhook
			// needs something to find. This must be loud: it needs a human.
			console.error(
				'CRITICAL: payable Stripe session could not be linked to its reservation.',
				JSON.stringify({ sessionId, reservationId, orderId: drinkOrderId })
			);
			throw error(500, 'We could not finish setting up checkout. Please contact us before paying.');
		}

		return json({ clientSecret, orderId: drinkOrderId, reservationId });
	}

	// Drop order: validate and decrement inventory atomically
	if (dropId) {
		const drop = db
			.prepare("SELECT * FROM drops WHERE id = ? AND status IN ('scheduled','live')")
			.get(dropId) as any;
		if (!drop) throw error(400, 'Drop not found or closed');

		const reserveItems = db.transaction(() => {
			const lineItems: { name: string; price_cents: number; quantity: number }[] = [];
			for (const item of items as { productId: number; quantity: number; dropItemId: number }[]) {
				const result = db
					.prepare(
						`UPDATE drop_items SET quantity_sold = quantity_sold + ?
					 WHERE id = ? AND drop_id = ? AND (quantity_available - quantity_sold) >= ?`
					)
					.run(item.quantity, item.dropItemId, dropId, item.quantity);
				if (result.changes === 0) {
					throw new Error(`Item ${item.dropItemId} sold out`);
				}
				// Excludes drinks, but deliberately NOT inactive products. A drop is a
				// money path that resolves products through drop_items.product_id
				// rather than getShopProduct, and a drink sold here would hold no
				// capacity, write no reservation row and never reach the drink run
				// sheet — so a drink must fail closed.
				//
				// `active` is a different thing: it controls shop visibility, and a
				// drop is a separate curated channel. GET /api/drops joins without an
				// active filter on purpose, so drop-only items are stocked as
				// active = 0 to keep them out of the bean shop while still selling
				// through the drop. Filtering on it here would display an item and
				// then refuse it at checkout.
				const di = db
					.prepare(
						`SELECT di.*, p.name, COALESCE(di.price_cents_override, p.price_cents) as price_cents
					 FROM drop_items di JOIN products p ON p.id = di.product_id
					 WHERE di.id = ? AND p.category != ?`
					)
					.get(item.dropItemId, DRINK_CATEGORY) as any;
				if (!di) {
					throw new Error(`Item ${item.dropItemId} is not available`);
				}
				lineItems.push({ name: di.name, price_cents: di.price_cents, quantity: item.quantity });
			}
			return lineItems;
		});

		let lineItems: { name: string; price_cents: number; quantity: number }[];
		try {
			lineItems = reserveItems();
		} catch (e: any) {
			throw error(409, e.message);
		}

		const totalCents = lineItems.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
		const result = db
			.prepare(
				'INSERT INTO orders (customer_email, customer_name, items, total_cents, status, drop_id, stage) VALUES (?,?,?,?,?,?,?)'
			)
			.run(email, name || '', JSON.stringify(items), totalCents, 'pending', dropId, 'ordered');
		const orderId = result.lastInsertRowid;

		// Check if drop is fully sold out
		const remaining = db
			.prepare(
				'SELECT SUM(quantity_available - quantity_sold) as r FROM drop_items WHERE drop_id = ?'
			)
			.get(dropId) as any;
		if (remaining.r === 0) {
			db.prepare("UPDATE drops SET status = 'sold_out' WHERE id = ?").run(dropId);
		}

		// Drops use pickup — no shipping needed, still uses embedded checkout
		const { clientSecret, sessionId } = await createCheckoutSession(
			lineItems,
			email,
			`${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`
		);
		db.prepare('UPDATE orders SET stripe_session_id = ? WHERE id = ?').run(sessionId, orderId);
		return json({ clientSecret, orderId });
	}

	// Regular (non-drop) checkout
	let hasBakery = false;
	const lineItems = items.map(
		(item: { productId: number; quantity: number; variant?: string; price_cents?: number }) => {
			// getShopProduct, not a raw active=1 lookup: a drink must never resolve
			// here. This is the physical-goods path — it collects shipping, holds no
			// slot and writes no reservation, so a drink bought through it is a paid
			// order nobody is ever told to make. The drink branch above owns drinks.
			const product = getShopProduct(db, item.productId);
			if (!product) throw error(400, `Product ${item.productId} not found`);
			if (product.stock_quantity !== null && product.stock_quantity < item.quantity) {
				throw error(409, `${product.name} is out of stock`);
			}
			if (product.category === 'bakery') hasBakery = true;

			let priceCents = product.price_cents;
			if (item.price_cents && product.variants) {
				try {
					const variants = JSON.parse(product.variants);
					if (variants.sizes && Array.isArray(variants.sizes)) {
						const validPrices = variants.sizes
							.filter((s: any) => typeof s === 'object' && s.price_cents)
							.map((s: any) => s.price_cents);
						if (validPrices.includes(item.price_cents)) {
							priceCents = item.price_cents;
						}
					}
				} catch {
					/* use default price */
				}
			}

			return {
				name: product.name + (item.variant ? ` (${item.variant})` : ''),
				price_cents: priceCents,
				quantity: item.quantity
			};
		}
	);

	const totalCents = lineItems.reduce((sum: number, i: any) => sum + i.price_cents * i.quantity, 0);

	const result = db
		.prepare(
			'INSERT INTO orders (customer_email, customer_name, items, total_cents, status) VALUES (?, ?, ?, ?, ?)'
		)
		.run(email || '', name || '', JSON.stringify(items), totalCents, 'pending');

	const orderId = result.lastInsertRowid;

	// NOTE: reservations are no longer created here. The drink branch above owns
	// them, and it writes status='pending' — only the Stripe webhook may promote
	// a reservation to 'confirmed'. The previous code inserted one carrying the
	// schema default of 'confirmed' before any payment had been taken.

	// Collect shipping for non-reservation orders. The rate is fixed at session-create
	// time from the ZIP the customer gave on the cart page (see stripe.ts).
	const collectShipping = !reservationData;
	const zip = typeof shippingZip === 'string' ? shippingZip.trim().slice(0, 5) : '';
	const { clientSecret, sessionId } = await createCheckoutSession(
		lineItems,
		email,
		`${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
		{ collectShipping, localOnly: hasBakery, shippingZip: zip }
	);
	db.prepare('UPDATE orders SET stripe_session_id = ? WHERE id = ?').run(sessionId, orderId);

	return json({ clientSecret, orderId });
}
