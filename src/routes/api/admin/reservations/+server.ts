import { json, error } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

export function GET({ cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const db = getDb();
	const reservations = db
		.prepare('SELECT * FROM reservations ORDER BY reservation_date DESC, time_slot')
		.all();
	return json(reservations);
}

/**
 * Mark a reservation picked up, or a no-show, or undo either.
 *
 * Deliberately narrow: this endpoint moves fulfilment flags only. It cannot set
 * `status`, because `confirmed` is reserved for the Stripe webhook — letting the
 * admin write it would make it possible to mark an unpaid reservation as paid
 * from the browser.
 *
 * Neither flag frees capacity: the drink was made either way, so it still counts
 * against what Deborah produced that day.
 */
export async function PUT({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');

	const { id, action } = await request.json().catch(() => ({ id: null, action: null }));
	if (!Number.isInteger(id) || id <= 0) throw error(400, 'A reservation id is required.');

	const db = getDb();
	const existing = db.prepare('SELECT id, status FROM reservations WHERE id = ?').get(id) as
		| { id: number; status: string }
		| undefined;
	if (!existing) throw error(404, 'Reservation not found.');
	// Fulfilment only applies to something that was actually paid for. The UI
	// already hides these buttons for other statuses, but the endpoint is the
	// contract.
	if (existing.status !== 'confirmed') {
		throw error(409, `Only a confirmed reservation can be marked. This one is ${existing.status}.`);
	}

	switch (action) {
		case 'picked_up':
			db.prepare(
				"UPDATE reservations SET picked_up_at = datetime('now'), no_show = 0 WHERE id = ?"
			).run(id);
			break;
		case 'no_show':
			db.prepare('UPDATE reservations SET no_show = 1, picked_up_at = NULL WHERE id = ?').run(id);
			break;
		case 'reset':
			db.prepare('UPDATE reservations SET no_show = 0, picked_up_at = NULL WHERE id = ?').run(id);
			break;
		default:
			throw error(400, 'action must be picked_up, no_show or reset.');
	}

	const updated = db
		.prepare('SELECT id, picked_up_at, no_show, status FROM reservations WHERE id = ?')
		.get(id);
	return json(updated);
}
