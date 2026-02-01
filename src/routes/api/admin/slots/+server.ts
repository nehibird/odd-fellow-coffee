import { json, error } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

export function GET({ cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const db = getDb();
	const slots = db.prepare('SELECT * FROM time_slots ORDER BY day_of_week, start_time').all();
	return json(slots);
}

export async function POST({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const body = await request.json();
	const db = getDb();
	const result = db.prepare(
		'INSERT INTO time_slots (day_of_week, start_time, end_time, capacity) VALUES (?, ?, ?, ?)'
	).run(body.day_of_week, body.start_time, body.end_time, body.capacity || 5);
	return json({ id: result.lastInsertRowid });
}

export async function PUT({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const body = await request.json();
	if (!body.id) throw error(400, 'id required');
	const db = getDb();
	db.prepare(
		'UPDATE time_slots SET day_of_week=?, start_time=?, end_time=?, capacity=?, active=? WHERE id=?'
	).run(body.day_of_week, body.start_time, body.end_time, body.capacity, body.active ? 1 : 0, body.id);
	return json({ ok: true });
}

export async function DELETE({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const { id } = await request.json();
	if (!id) throw error(400, 'id required');
	const db = getDb();
	db.prepare('DELETE FROM time_slots WHERE id = ?').run(id);
	return json({ ok: true });
}
