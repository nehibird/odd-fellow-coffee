import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { createCheckoutSession } from '$lib/server/stripe';
import { SITE_URL } from '$env/static/private';
import { isValidEmail } from '$lib/server/validation';

export async function POST({ request }) {
	const { items, email, name, reservationData, dropId } = await request.json();

	if (!items?.length) {
		throw error(400, 'Items required');
	}
	// Email is optional - Stripe will collect it during checkout
	if (email && !isValidEmail(email)) {
		throw error(400, 'Invalid email format');
	}

	const db = getDb();

	// Drop order: validate and decrement inventory atomically
	if (dropId) {
		const drop = db.prepare("SELECT * FROM drops WHERE id = ? AND status IN ('scheduled','live')").get(dropId) as any;
		if (!drop) throw error(400, 'Drop not found or closed');

		const reserveItems = db.transaction(() => {
			const lineItems: { name: string; price_cents: number; quantity: number }[] = [];
			for (const item of items as { productId: number; quantity: number; dropItemId: number }[]) {
				const result = db.prepare(
					`UPDATE drop_items SET quantity_sold = quantity_sold + ?
					 WHERE id = ? AND drop_id = ? AND (quantity_available - quantity_sold) >= ?`
				).run(item.quantity, item.dropItemId, dropId, item.quantity);
				if (result.changes === 0) {
					throw new Error(`Item ${item.dropItemId} sold out`);
				}
				const di = db.prepare(
					`SELECT di.*, p.name, COALESCE(di.price_cents_override, p.price_cents) as price_cents
					 FROM drop_items di JOIN products p ON p.id = di.product_id WHERE di.id = ?`
				).get(item.dropItemId) as any;
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
		const result = db.prepare(
			'INSERT INTO orders (customer_email, customer_name, items, total_cents, status, drop_id, stage) VALUES (?,?,?,?,?,?,?)'
		).run(email, name || '', JSON.stringify(items), totalCents, 'pending', dropId, 'ordered');
		const orderId = result.lastInsertRowid;

		// Check if drop is fully sold out
		const remaining = db.prepare(
			'SELECT SUM(quantity_available - quantity_sold) as r FROM drop_items WHERE drop_id = ?'
		).get(dropId) as any;
		if (remaining.r === 0) {
			db.prepare("UPDATE drops SET status = 'sold_out' WHERE id = ?").run(dropId);
		}

		const session = await createCheckoutSession(
			lineItems, email,
			`${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
			`${SITE_URL}/checkout/cancel`
		);
		db.prepare('UPDATE orders SET stripe_session_id = ? WHERE id = ?').run(session.id, orderId);
		return json({ url: session.url, orderId });
	}

	// Regular (non-drop) checkout
	const lineItems = items.map((item: { productId: number; quantity: number; variant?: string; price_cents?: number }) => {
		const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(item.productId) as any;
		if (!product) throw error(400, `Product ${item.productId} not found`);
		if (product.stock_quantity !== null && product.stock_quantity < item.quantity) {
			throw error(409, `${product.name} is out of stock`);
		}

		// Use cart price if provided (for variant pricing), otherwise use product base price
		let priceCents = product.price_cents;
		if (item.price_cents && product.variants) {
			// Validate the price matches a valid variant price
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
			} catch { /* use default price */ }
		}

		return {
			name: product.name + (item.variant ? ` (${item.variant})` : ''),
			price_cents: priceCents,
			quantity: item.quantity
		};
	});

	const totalCents = lineItems.reduce((sum: number, i: any) => sum + i.price_cents * i.quantity, 0);

	const result = db.prepare(
		'INSERT INTO orders (customer_email, customer_name, items, total_cents, status) VALUES (?, ?, ?, ?, ?)'
	).run(email || '', name || '', JSON.stringify(items), totalCents, 'pending');

	const orderId = result.lastInsertRowid;

	if (reservationData) {
		db.prepare(
			'INSERT INTO reservations (order_id, reservation_date, time_slot, items, customer_name, customer_email) VALUES (?, ?, ?, ?, ?, ?)'
		).run(orderId, reservationData.date, reservationData.timeSlot, JSON.stringify(items), name || '', email);
	}

	const collectShipping = !reservationData;
	const session = await createCheckoutSession(
		lineItems, email,
		`${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
		`${SITE_URL}/checkout/cancel`,
		{ collectShipping }
	);
	db.prepare('UPDATE orders SET stripe_session_id = ? WHERE id = ?').run(session.id, orderId);

	return json({ url: session.url, orderId });
}
