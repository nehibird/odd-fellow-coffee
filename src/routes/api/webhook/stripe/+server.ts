import { error, json } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe';
import { STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { getDb } from '$lib/server/db';
import { sendOrderConfirmation } from '$lib/server/email';

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

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object;
		const db = getDb();

		const order = db.prepare('SELECT * FROM orders WHERE stripe_session_id = ?').get(session.id) as any;
		if (order) {
			db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('confirmed', order.id);

			try {
				await sendOrderConfirmation(
					order.customer_email,
					order.customer_name,
					order.id,
					order.total_cents
				);
			} catch (e) {
				console.error('Email send failed:', e);
			}
		}
	}

	return json({ received: true });
}
