import { json, error } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { sendSubscriptionFulfilled } from '$lib/server/email';

export function GET({ cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const db = getDb();
	const subs = db.prepare(
		`SELECT s.*, p.name as product_name FROM subscriptions s
		 LEFT JOIN products p ON p.id = s.product_id
		 ORDER BY s.next_delivery_date ASC, s.created_at DESC`
	).all();
	return json(subs);
}

export async function PATCH({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const { id, action } = await request.json();
	if (!id || typeof id !== 'number') throw error(400, 'Valid id required');

	const db = getDb();
	const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as any;
	if (!sub) throw error(404, 'Subscription not found');

	if (action === 'fulfill') {
		const now = new Date();
		// Calculate next delivery based on frequency
		let nextDelivery = new Date(now);
		if (sub.frequency === 'weekly') {
			nextDelivery.setDate(nextDelivery.getDate() + 7);
		} else if (sub.frequency === 'biweekly') {
			nextDelivery.setDate(nextDelivery.getDate() + 14);
		} else {
			nextDelivery.setMonth(nextDelivery.getMonth() + 1);
		}

		const nextDeliveryStr = nextDelivery.toISOString().split('T')[0];

		db.prepare(
			'UPDATE subscriptions SET last_fulfilled_at = ?, next_delivery_date = ? WHERE id = ?'
		).run(now.toISOString(), nextDeliveryStr, id);

		// Get product name and send fulfillment email
		const product = db.prepare('SELECT name FROM products WHERE id = ?').get(sub.product_id) as { name: string } | undefined;
		const productName = product?.name || 'Subscription Item';
		const formattedDate = nextDelivery.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

		try {
			await sendSubscriptionFulfilled(sub.customer_email, productName, sub.variant, formattedDate);
		} catch (e) {
			console.error('Failed to send fulfillment email:', e);
		}

		return json({ ok: true, next_delivery_date: nextDeliveryStr });
	}

	throw error(400, 'Unknown action');
}
