import { json, error } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { getDb, DRINK_SLOT_TYPE } from '$lib/server/db';
import { todayInChicago } from '$lib/server/reservations';

const SLOT_TYPES = ['pickup', DRINK_SLOT_TYPE] as const;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface SlotInput {
	day_of_week: number;
	start_time: string;
	end_time: string;
	capacity?: number;
	capacity_drinks?: number | null;
	slot_type?: string;
	active?: boolean;
}

/**
 * Validate a slot and normalise its fields.
 *
 * A drinks slot with no `capacity_drinks` is not a harmless default: the
 * capacity engine treats NULL as zero (fail closed, so a misconfigured window
 * sells nothing rather than everything), which means such a slot is
 * permanently "sold out" with nothing to tell the operator why. So a drinks
 * slot must carry a positive drink capacity.
 */
function validate(body: Partial<SlotInput>): {
	day_of_week: number;
	start_time: string;
	end_time: string;
	capacity: number;
	capacity_drinks: number | null;
	slot_type: string;
	active: number;
} {
	const dow = Number(body.day_of_week);
	if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
		throw error(400, 'Day of week must be 0 (Sunday) to 6 (Saturday).');
	}

	const start = String(body.start_time ?? '');
	const end = String(body.end_time ?? '');
	if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
		throw error(400, 'Times must be in 24-hour HH:MM form.');
	}
	if (start >= end) throw error(400, 'The start time must be before the end time.');

	const slotType = String(body.slot_type ?? 'pickup');
	if (!(SLOT_TYPES as readonly string[]).includes(slotType)) {
		throw error(400, `Slot type must be one of: ${SLOT_TYPES.join(', ')}.`);
	}

	const capacity = Number(body.capacity ?? 0);
	if (!Number.isInteger(capacity) || capacity < 0) {
		throw error(400, 'Capacity must be a whole number of zero or more.');
	}

	let capacityDrinks: number | null = null;
	if (slotType === DRINK_SLOT_TYPE) {
		capacityDrinks = Number(body.capacity_drinks);
		if (!Number.isInteger(capacityDrinks) || capacityDrinks <= 0) {
			throw error(
				400,
				'A drinks window needs a drink capacity of at least 1, otherwise it can never be booked.'
			);
		}
	}

	return {
		day_of_week: dow,
		start_time: start,
		end_time: end,
		capacity,
		capacity_drinks: capacityDrinks,
		slot_type: slotType,
		// GET returns `active` as the integer 0/1, so a client that reads a slot
		// and PUTs it back sends 0 — which is not `=== false`. Treating that as
		// "active" would silently reactivate a window that DELETE had taken
		// offline because it had reservations against it.
		active: body.active === undefined ? 1 : body.active ? 1 : 0
	};
}

/**
 * Reject a window that already exists for the same day and type.
 *
 * Nothing in the schema prevents duplicates, and two slots sharing a
 * "start-end" label are worse than merely untidy: each advertises its own
 * capacity while a single hold counts against both, because holds are matched
 * by that label. getDrinkSlots collapses them at read time; this stops them
 * being created at all.
 */
function findSameWindow(
	db: ReturnType<typeof getDb>,
	slot: ReturnType<typeof validate>,
	excludeId?: number
): { id: number; active: number } | undefined {
	return db
		.prepare(
			`SELECT id, active FROM time_slots
			  WHERE day_of_week = ? AND start_time = ? AND end_time = ? AND slot_type = ?
			    AND id != ?`
		)
		.get(slot.day_of_week, slot.start_time, slot.end_time, slot.slot_type, excludeId ?? -1) as
		| { id: number; active: number }
		| undefined;
}

/**
 * Reject a window that already exists and is LIVE.
 *
 * An inactive row is not a clash: DELETE deactivates a window that still has
 * reservations, and the slots page has no reactivate control, so treating that
 * row as a duplicate would make the window unrecoverable without hand-editing
 * SQLite. POST revives it instead — see below.
 */
function assertNoDuplicate(
	db: ReturnType<typeof getDb>,
	slot: ReturnType<typeof validate>,
	excludeId?: number
) {
	const clash = findSameWindow(db, slot, excludeId);
	if (clash && clash.active) throw error(409, 'That window already exists for this day.');
}

export function GET({ cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const db = getDb();
	const slots = db.prepare('SELECT * FROM time_slots ORDER BY day_of_week, start_time').all();
	return json(slots);
}

export async function POST({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const db = getDb();
	const body = await request.json().catch(() => null);
	if (!body) throw error(400, 'A slot body is required.');
	const slot = validate(body);
	assertNoDuplicate(db, slot);

	// Re-creating a window that was deactivated revives it rather than failing,
	// so an operator is never stuck with a window they cannot offer again.
	const dormant = findSameWindow(db, slot);
	if (dormant && !dormant.active) {
		db.prepare(
			`UPDATE time_slots SET capacity = ?, capacity_drinks = ?, active = 1 WHERE id = ?`
		).run(slot.capacity, slot.capacity_drinks, dormant.id);
		return json({ id: dormant.id, reactivated: true });
	}

	const result = db
		.prepare(
			`INSERT INTO time_slots (day_of_week, start_time, end_time, capacity, active, slot_type, capacity_drinks)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.run(
			slot.day_of_week,
			slot.start_time,
			slot.end_time,
			slot.capacity,
			slot.active,
			slot.slot_type,
			slot.capacity_drinks
		);
	return json({ id: result.lastInsertRowid });
}

export async function PUT({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const body = await request.json().catch(() => null);
	if (!Number.isInteger(body?.id)) throw error(400, 'id required');

	const db = getDb();
	const slot = validate(body);
	assertNoDuplicate(db, slot, body.id);

	db.prepare(
		`UPDATE time_slots
		    SET day_of_week = ?, start_time = ?, end_time = ?, capacity = ?, active = ?,
		        slot_type = ?, capacity_drinks = ?
		  WHERE id = ?`
	).run(
		slot.day_of_week,
		slot.start_time,
		slot.end_time,
		slot.capacity,
		slot.active,
		slot.slot_type,
		slot.capacity_drinks,
		body.id
	);
	return json({ ok: true });
}

export async function DELETE({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const body = await request.json().catch(() => null);
	const id = body?.id;
	if (!id) throw error(400, 'id required');

	const db = getDb();
	// A window with UPCOMING reservations must not vanish: the run sheet reads
	// reservations by their time_slot label, so deleting the slot would orphan
	// them. Deactivating keeps the history and stops new bookings.
	const row = db
		.prepare('SELECT start_time, end_time, day_of_week FROM time_slots WHERE id = ?')
		.get(id) as { start_time: string; end_time: string; day_of_week: number } | undefined;
	if (!row) throw error(404, 'Slot not found.');

	// The label alone is NOT specific enough: the same "07:00-08:00" exists on
	// every weekday, so one Monday booking would otherwise make Tuesday's slot
	// undeletable and report a reservation count that is not its own. Scope to
	// this slot's own weekday, and ignore days that have already passed —
	// otherwise a reservation from last year pins the window forever.
	const booked = db
		.prepare(
			`SELECT COUNT(*) AS c FROM reservations
			  WHERE time_slot = ?
			    AND CAST(strftime('%w', reservation_date) AS INTEGER) = ?
			    AND reservation_date >= ?
			    AND status NOT IN ('cancelled', 'expired')`
		)
		.get(`${row.start_time}-${row.end_time}`, row.day_of_week, todayInChicago(new Date())) as {
		c: number;
	};

	if (booked.c > 0) {
		db.prepare('UPDATE time_slots SET active = 0 WHERE id = ?').run(id);
		return json({ ok: true, deactivated: true, reservations: booked.c });
	}

	db.prepare('DELETE FROM time_slots WHERE id = ?').run(id);
	return json({ ok: true, deleted: true });
}
