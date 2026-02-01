import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';

export function GET({ url }) {
	const db = getDb();
	const date = url.searchParams.get('date');

	if (!date) {
		const slots = db.prepare('SELECT * FROM time_slots WHERE active = 1 ORDER BY day_of_week, start_time').all();
		return json(slots);
	}

	const dayOfWeek = new Date(date + 'T12:00:00').getDay();
	const slots = db.prepare('SELECT * FROM time_slots WHERE active = 1 AND day_of_week = ? ORDER BY start_time').all(dayOfWeek);

	// Check capacity: count existing reservations for each slot
	const slotsWithAvailability = (slots as any[]).map((slot) => {
		const reserved = db.prepare(
			'SELECT COUNT(*) as count FROM reservations WHERE reservation_date = ? AND time_slot = ? AND status != ?'
		).get(date, `${slot.start_time}-${slot.end_time}`, 'cancelled') as { count: number };
		return { ...slot, available: slot.capacity - reserved.count };
	});

	return json(slotsWithAvailability);
}
