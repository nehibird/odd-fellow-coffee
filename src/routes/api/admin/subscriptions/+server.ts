import { json, error } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

export function GET({ cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const db = getDb();
	const subs = db.prepare(
		`SELECT s.*, p.name as product_name FROM subscriptions s
		 LEFT JOIN products p ON p.id = s.product_id
		 ORDER BY s.created_at DESC`
	).all();
	return json(subs);
}
