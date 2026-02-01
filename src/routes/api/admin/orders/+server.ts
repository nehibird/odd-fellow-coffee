import { json, error } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { isValidOrderStatus, isValidOrderStage } from '$lib/server/validation';

export function GET({ cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const db = getDb();
	const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
	return json(orders);
}

export async function PUT({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const { id, status, stage } = await request.json();
	if (!id) throw error(400, 'id required');
	const db = getDb();
	if (status) {
		if (!isValidOrderStatus(status)) throw error(400, 'Invalid status value');
		db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
	}
	if (stage) {
		if (!isValidOrderStage(stage)) throw error(400, 'Invalid stage value');
		db.prepare('UPDATE orders SET stage = ? WHERE id = ?').run(stage, id);
	}
	return json({ ok: true });
}
