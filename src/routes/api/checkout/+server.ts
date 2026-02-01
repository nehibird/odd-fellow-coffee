import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { createCheckoutSession } from '$lib/server/stripe';
import { SITE_URL } from '$env/static/private';

export async function POST({ request }) {
	const { items, email, name, reservationData } = await request.json();

	if (!items?.length || !email) {
		throw error(400, 'Items and email required');
	}

	const db = getDb();

	// Validate products exist
	const lineItems = items.map((item: { productId: number; quantity: number; variant?: string }) => {
		const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(item.productId) as any;
		if (!product) throw error(400, `Product ${item.productId} not found`);
		return {
			name: product.name + (item.variant ? ` (${item.variant})` : ''),
			price_cents: product.price_cents,
			quantity: item.quantity
		};
	});

	const totalCents = lineItems.reduce((sum: number, i: any) => sum + i.price_cents * i.quantity, 0);

	// Create order record
	const result = db.prepare(
		'INSERT INTO orders (customer_email, customer_name, items, total_cents, status) VALUES (?, ?, ?, ?, ?)'
	).run(email, name || '', JSON.stringify(items), totalCents, 'pending');

	const orderId = result.lastInsertRowid;

	// Create reservation if included
	if (reservationData) {
		db.prepare(
			'INSERT INTO reservations (order_id, reservation_date, time_slot, items, customer_name, customer_email) VALUES (?, ?, ?, ?, ?, ?)'
		).run(
			orderId,
			reservationData.date,
			reservationData.timeSlot,
			JSON.stringify(items),
			name || '',
			email
		);
	}

	const session = await createCheckoutSession(
		lineItems,
		email,
		`${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
		`${SITE_URL}/checkout/cancel`
	);

	// Store stripe session ID
	db.prepare('UPDATE orders SET stripe_session_id = ? WHERE id = ?').run(session.id, orderId);

	return json({ url: session.url, orderId });
}
