import { json, error } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

export function GET({ cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const db = getDb();
	const reservations = db.prepare('SELECT * FROM reservations ORDER BY reservation_date DESC, time_slot').all();
	return json(reservations);
}
