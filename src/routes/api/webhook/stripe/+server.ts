import { error, json } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe';
import { STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { getDb } from '$lib/server/db';
import { sendOrderConfirmation, sendPaymentFailed } from '$lib/server/email';

export async function POST({ request }) {
	const body = await request.text();
	const sig = request.headers.get('stripe-signature');

	if (!sig) throw error(400, 'Missing signature');

	let event;
	try {
		event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
	} catch (err) {
		throw error(400, 'Invalid signature');
	}

	const db = getDb();

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object as any;

		if (session.mode === 'subscription') {
			const productId = session.metadata?.product_id;
			const frequency = session.metadata?.frequency;
			const variant = session.metadata?.variant || null;
			const priceCents = session.metadata?.price_cents ? Number(session.metadata.price_cents) : null;
			const subId = session.subscription;

			// Verify product_id references an actual product in our DB
			if (productId) {
				const product = db.prepare('SELECT id FROM products WHERE id = ?').get(Number(productId));
				if (!product) {
					console.error(`Webhook: product_id ${productId} not found, ignoring subscription`);
					return json({ received: true });
				}
			}

			if (subId) {
				const stripeSub = await stripe.subscriptions.retrieve(subId as string);

				// Extract shipping info
				const shipping = session.shipping_details;
				let shippingName = null;
				let shippingAddress = null;
				if (shipping?.address) {
					shippingName = shipping.name || '';
					shippingAddress = JSON.stringify({
						line1: shipping.address.line1,
						line2: shipping.address.line2 || '',
						city: shipping.address.city,
						state: shipping.address.state,
						postal_code: shipping.address.postal_code,
						country: shipping.address.country
					});
				}

				// First delivery is always ~1 week out (for roasting), regardless of frequency
				const now = new Date();
				let nextDelivery = new Date(now);
				nextDelivery.setDate(nextDelivery.getDate() + 7);

				db.prepare(
					`INSERT INTO subscriptions (stripe_subscription_id, customer_email, product_id, frequency, status, stripe_price_id, current_period_end, variant, price_cents, shipping_name, shipping_address, next_delivery_date)
					 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
				).run(
					stripeSub.id,
					session.customer_email,
					productId ? Number(productId) : null,
					frequency || null,
					stripeSub.status,
					stripeSub.items.data[0]?.price?.id || null,
					new Date(stripeSub.current_period_end * 1000).toISOString(),
					variant,
					priceCents,
					shippingName,
					shippingAddress,
					nextDelivery.toISOString().split('T')[0]
				);
			}
		} else {
			// One-time payment — retrieve full session for shipping details
			const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
				expand: ['shipping_cost.shipping_rate']
			}) as any;
			const order = db.prepare('SELECT * FROM orders WHERE stripe_session_id = ?').get(session.id) as any;
			if (order) {
				const customerEmail = session.customer_email || session.customer_details?.email || fullSession.customer_details?.email || fullSession.customer_email || order.customer_email;
				const customerName = fullSession.shipping_details?.name || fullSession.customer_details?.name || order.customer_name || '';
				console.log('Webhook checkout.session.completed — email sources:', {
					'session.customer_email': session.customer_email,
					'session.customer_details?.email': session.customer_details?.email,
					'fullSession.customer_details?.email': fullSession.customer_details?.email,
					'fullSession.customer_email': fullSession.customer_email,
					'order.customer_email': order.customer_email,
					resolved: customerEmail
				});
				const shipping = fullSession.shipping_details;
				const shippingCost = fullSession.shipping_cost;
				if (shipping?.address) {
					const addr = JSON.stringify({
						line1: shipping.address.line1,
						line2: shipping.address.line2 || '',
						city: shipping.address.city,
						state: shipping.address.state,
						postal_code: shipping.address.postal_code,
						country: shipping.address.country
					});
					const rateName = (shippingCost?.shipping_rate as any)?.display_name || '';
					const shippingCents = shippingCost?.amount_total || 0;
					db.prepare(
						'UPDATE orders SET status = ?, customer_email = ?, customer_name = ?, shipping_name = ?, shipping_address = ?, shipping_method = ?, shipping_cents = ? WHERE id = ?'
					).run('confirmed', customerEmail, customerName, shipping.name || '', addr, rateName, shippingCents, order.id);
				} else {
					db.prepare('UPDATE orders SET status = ?, customer_email = ?, customer_name = ? WHERE id = ?').run('confirmed', customerEmail, customerName, order.id);
				}
				// Decrement stock for tracked products + build enriched items for email
				let enrichedItems: { productId: number; name: string; quantity: number; price_cents: number; variant?: string }[] = [];
				try {
					const orderItems = JSON.parse(order.items) as { productId: number; quantity: number; price_cents: number; variant?: string }[];
					for (const item of orderItems) {
						const product = item.productId ? db.prepare('SELECT name FROM products WHERE id = ?').get(item.productId) as any : null;
						enrichedItems.push({
							...item,
							name: product?.name || `Item #${item.productId}`
						});
						if (item.productId) {
							db.prepare(
								'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity IS NOT NULL'
							).run(item.quantity || 1, item.productId);
						}
					}
				} catch (e) {
					console.error('Stock decrement failed:', e);
				}
				try {
					const shippingAddr = shipping?.address ? {
						line1: shipping.address.line1,
						line2: shipping.address.line2 || '',
						city: shipping.address.city,
						state: shipping.address.state,
						postal_code: shipping.address.postal_code
					} : undefined;
					await sendOrderConfirmation(customerEmail, customerName, {
						id: order.id,
						items: enrichedItems,
						totalCents: order.total_cents,
						shippingMethod: (shippingCost?.shipping_rate as any)?.display_name,
						shippingCents: shippingCost?.amount_total || 0,
						shippingAddress: shippingAddr
					});
				} catch (e) {
					console.error('Email send failed:', e);
				}
			}
		}
	}

	if (event.type === 'checkout.session.expired') {
		// Release drop inventory for abandoned checkouts
		const session = event.data.object as any;
		const order = db.prepare("SELECT * FROM orders WHERE stripe_session_id = ? AND status = 'pending'").get(session.id) as any;
		if (order?.drop_id) {
			try {
				const items = JSON.parse(order.items) as { dropItemId: number; quantity: number }[];
				const release = db.transaction(() => {
					for (const item of items) {
						if (item.dropItemId) {
							db.prepare(
								'UPDATE drop_items SET quantity_sold = MAX(0, quantity_sold - ?) WHERE id = ? AND drop_id = ?'
							).run(item.quantity, item.dropItemId, order.drop_id);
						}
					}
					// Reopen drop if it was marked sold_out
					db.prepare("UPDATE drops SET status = 'live' WHERE id = ? AND status = 'sold_out'").run(order.drop_id);
				});
				release();
			} catch (e) {
				console.error('Failed to release drop inventory:', e);
			}
			db.prepare("UPDATE orders SET status = 'expired' WHERE id = ?").run(order.id);
		}
	}

	if (event.type === 'customer.subscription.updated') {
		const sub = event.data.object as any;
		db.prepare(
			`UPDATE subscriptions SET status = ?, current_period_end = ?, cancel_at_period_end = ?
			 WHERE stripe_subscription_id = ?`
		).run(
			sub.status,
			new Date(sub.current_period_end * 1000).toISOString(),
			sub.cancel_at_period_end ? 1 : 0,
			sub.id
		);
	}

	if (event.type === 'customer.subscription.deleted') {
		const sub = event.data.object as any;
		db.prepare(
			"UPDATE subscriptions SET status = 'canceled' WHERE stripe_subscription_id = ?"
		).run(sub.id);
	}

	if (event.type === 'invoice.payment_failed') {
		const invoice = event.data.object as any;
		const subId = invoice.subscription;
		if (subId) {
			db.prepare(
				"UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = ?"
			).run(subId);
			const localSub = db.prepare(
				'SELECT customer_email FROM subscriptions WHERE stripe_subscription_id = ?'
			).get(subId) as any;
			if (localSub?.customer_email) {
				try {
					await sendPaymentFailed(localSub.customer_email, invoice.hosted_invoice_url || '');
				} catch (e) {
					console.error('Payment failed email error:', e);
				}
			}
		}
	}

	return json({ received: true });
}
