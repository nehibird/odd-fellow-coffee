import { json, error } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

export function GET({ cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const db = getDb();
	const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
	return json(orders);
}

export async function PUT({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const { id, status } = await request.json();
	if (!id || !status) throw error(400, 'id and status required');
	const db = getDb();
	db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
	return json({ ok: true });
}
