import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { applySchema, setSettingOn, DRINK_SLOT_TYPE, DRINKS_DEFAULT_CUTOFF_HOUR } from './db';
import type { HoldReason } from './reservations';
import {
	chicagoOffsetMinutes,
	todayInChicago,
	weekdayOf,
	orderCutoffInstant,
	cutoffHourFor,
	isDateOrderable,
	getDrinkSlots,
	getSlotAvailability,
	holdCapacity,
	releaseCapacity,
	confirmReservation,
	drinksEnabled,
	refusalMessage,
	CANCELLED_STATUSES
} from './reservations';

// Fixtures verified against the IANA tz database:
//   2026-11-20 is a Friday in CST (GMT-6) -> 20:00 the day before = 2026-11-20T02:00:00Z
//   2026-07-10 is a Friday in CDT (GMT-5) -> 20:00 the day before = 2026-07-10T01:00:00Z
// The one-hour difference between those two is the whole point: it only comes out
// right if the cutoff is computed in America/Chicago rather than at a fixed offset.
const FRI_CST = '2026-11-20';
const FRI_CDT = '2026-07-10';
const SAT_CST = '2026-11-21';
const CUTOFF_CST = new Date('2026-11-20T02:00:00Z');
const CUTOFF_CDT = new Date('2026-07-10T01:00:00Z');

let dir: string;
let db: Database.Database;

/** A real, fully migrated database on a throwaway file. */
function freshDb(path: string): Database.Database {
	const d = new Database(path);
	d.pragma('journal_mode = WAL');
	d.pragma('foreign_keys = ON');
	applySchema(d);
	return d;
}

/** The 2:45-3:15 PM Mon-Fri drink window, with the given per-slot drink capacity. */
function seedDrinkSlots(d: Database.Database, capacityDrinks: number) {
	for (let dow = 1; dow <= 5; dow++) {
		d.prepare(
			`INSERT INTO time_slots (day_of_week, start_time, end_time, capacity, active, slot_type, capacity_drinks)
			 VALUES (?,?,?,?,1,?,?)`
		).run(dow, '14:45', '15:15', 0, DRINK_SLOT_TYPE, capacityDrinks);
	}
}

const SLOT = '14:45-15:15';

/** Insert a reservation directly, bypassing the capacity guard, to set up state. */
function seedReservation(
	d: Database.Database,
	date: string,
	drinks: number,
	status = 'confirmed',
	sessionId: string | null = null
) {
	d.prepare(
		`INSERT INTO reservations (reservation_date, time_slot, drink_count, status, stripe_session_id, customer_email)
		 VALUES (?,?,?,?,?,?)`
	).run(date, SLOT, drinks, status, sessionId, 'test@example.com');
}

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'ofc-res-'));
	db = freshDb(join(dir, 'test.db'));
});

afterEach(() => {
	// Guarded: if beforeEach throws, `db` is undefined and an unguarded close()
	// buries the real failure under one TypeError per test.
	db?.close();
	if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('chicagoOffsetMinutes', () => {
	it('returns -360 (CST) in November and -300 (CDT) in July', () => {
		expect(chicagoOffsetMinutes(new Date('2026-11-19T18:00:00Z'))).toBe(-360);
		expect(chicagoOffsetMinutes(new Date('2026-07-09T18:00:00Z'))).toBe(-300);
	});

	it('changes across the spring-forward boundary', () => {
		// DST begins 2026-03-08 at 02:00 local.
		expect(chicagoOffsetMinutes(new Date('2026-03-07T18:00:00Z'))).toBe(-360);
		expect(chicagoOffsetMinutes(new Date('2026-03-09T18:00:00Z'))).toBe(-300);
	});
});

describe('todayInChicago', () => {
	it('uses the Chicago calendar day, not the UTC one', () => {
		// 03:00Z on the 20th is still the evening of the 19th in Chicago.
		expect(todayInChicago(new Date('2026-11-20T03:00:00Z'))).toBe('2026-11-19');
		expect(todayInChicago(new Date('2026-11-20T13:00:00Z'))).toBe('2026-11-20');
	});
});

describe('weekdayOf', () => {
	it('names the weekday of a calendar date', () => {
		expect(weekdayOf(FRI_CST)).toBe('friday');
		expect(weekdayOf(SAT_CST)).toBe('saturday');
		expect(weekdayOf(FRI_CDT)).toBe('friday');
	});
});

describe('orderCutoffInstant', () => {
	it('is 20:00 Chicago on the day before, in CST', () => {
		expect(orderCutoffInstant(FRI_CST, 20)!.toISOString()).toBe(CUTOFF_CST.toISOString());
	});

	it('is 20:00 Chicago on the day before, in CDT — an hour earlier in UTC', () => {
		expect(orderCutoffInstant(FRI_CDT, 20)!.toISOString()).toBe(CUTOFF_CDT.toISOString());
	});

	it('does not drift when the cutoff hour changes', () => {
		expect(orderCutoffInstant(FRI_CST, 17)!.toISOString()).toBe('2026-11-19T23:00:00.000Z');
	});
});

describe('orderCutoffInstant hardening', () => {
	it('returns null for a date that is not a real calendar date', () => {
		// Previously this reached Date.UTC(NaN) -> Intl.formatToParts(Invalid Date)
		// -> RangeError, which surfaced as a 500 from /api/slots?type=drinks&date=abc.
		for (const bad of ['abc', '2026-1-5', '2026-02-30', '2026-13-01', '']) {
			expect(orderCutoffInstant(bad, 20)).toBeNull();
		}
	});

	it('clamps an out-of-range cutoff hour instead of rolling past the pickup date', () => {
		// An hour of 200 put the cutoff ~8 days AFTER the pickup date, so
		// `now >= cutoff` was never true and same-day ordering became possible.
		const sane = orderCutoffInstant(FRI_CST, 20)!;
		for (const bad of [200, -1, 24, 1.5, NaN]) {
			expect(orderCutoffInstant(FRI_CST, bad)!.toISOString()).toBe(sane.toISOString());
		}
	});

	it('never returns a cutoff at or after the pickup day begins', () => {
		for (const hour of [0, 1, 12, 20, 23]) {
			const cutoff = orderCutoffInstant(FRI_CST, hour)!;
			expect(cutoff.getTime()).toBeLessThan(Date.parse(`${FRI_CST}T06:00:00Z`));
		}
	});
});

describe('cutoffHourFor', () => {
	it.each([
		['200', DRINKS_DEFAULT_CUTOFF_HOUR],
		['-1', DRINKS_DEFAULT_CUTOFF_HOUR],
		['24', DRINKS_DEFAULT_CUTOFF_HOUR],
		['', DRINKS_DEFAULT_CUTOFF_HOUR],
		['abc', DRINKS_DEFAULT_CUTOFF_HOUR],
		['0', 0],
		['17', 17],
		['23', 23]
	])('setting %s resolves to hour %i', (raw, expected) => {
		setSettingOn(db, 'drinks_cutoff_hour', raw as string);
		expect(cutoffHourFor(db)).toBe(expected);
	});

	it('keeps enforcement and the clamp in agreement', () => {
		seedDrinkSlots(db, 12);
		setSettingOn(db, 'drinks_cutoff_hour', '200');
		// With the clamp, 20:00 is still enforced: 02:01Z on the pickup day is late.
		expect(isDateOrderable(db, FRI_CST, new Date('2026-11-20T02:01:00Z'))).toMatchObject({
			ok: false,
			reason: 'cutoff_passed'
		});
	});
});

describe('isDateOrderable', () => {
	beforeEach(() => {
		seedDrinkSlots(db, 12);
	});

	it('accepts one minute before the cutoff', () => {
		const now = new Date(CUTOFF_CST.getTime() - 60_000);
		expect(isDateOrderable(db, FRI_CST, now)).toMatchObject({ ok: true });
	});

	it('rejects one minute after the cutoff', () => {
		const now = new Date(CUTOFF_CST.getTime() + 60_000);
		expect(isDateOrderable(db, FRI_CST, now)).toMatchObject({ ok: false, reason: 'cutoff_passed' });
	});

	it('rejects exactly at the cutoff', () => {
		expect(isDateOrderable(db, FRI_CST, CUTOFF_CST)).toMatchObject({ ok: false });
	});

	it('applies the cutoff in CDT too — 01:59Z ok, 02:01Z too late for a July Friday', () => {
		expect(isDateOrderable(db, FRI_CDT, new Date(CUTOFF_CDT.getTime() - 60_000))).toMatchObject({
			ok: true
		});
		// 02:01Z would still be before the CST-equivalent cutoff. If the code used a
		// fixed -6 offset this would wrongly pass.
		expect(isDateOrderable(db, FRI_CDT, new Date('2026-07-10T02:01:00Z'))).toMatchObject({
			ok: false,
			reason: 'cutoff_passed'
		});
	});

	it('rejects a weekday that is not an ordering day', () => {
		const now = new Date('2026-11-20T12:00:00Z');
		expect(isDateOrderable(db, SAT_CST, now)).toMatchObject({ ok: false, reason: 'closed_day' });
	});

	it('rejects a date in the past', () => {
		const now = new Date('2026-11-25T12:00:00Z');
		expect(isDateOrderable(db, FRI_CST, now)).toMatchObject({ ok: false });
	});

	it('rejects a malformed date', () => {
		const now = new Date('2026-11-18T12:00:00Z');
		expect(isDateOrderable(db, 'not-a-date', now)).toMatchObject({ ok: false, reason: 'bad_date' });
	});

	it.each(['2026-02-30', '2026-13-01', '2026-11-31', '2026-00-10'])(
		'rejects %s — right shape, not a real calendar date',
		(bad) => {
			// These all pass /^\d{4}-\d{2}-\d{2}$/ but roll over in Date.UTC, so
			// 2026-02-30 would silently become March 2 if it were not caught.
			const now = new Date('2026-01-01T12:00:00Z');
			expect(isDateOrderable(db, bad, now)).toMatchObject({ ok: false, reason: 'bad_date' });
		}
	);

	it('rejects a day with no drink slots configured', () => {
		const empty = freshDb(join(dir, 'empty.db'));
		try {
			const now = new Date('2026-11-18T12:00:00Z');
			expect(isDateOrderable(empty, FRI_CST, now)).toMatchObject({ ok: false, reason: 'no_slots' });
		} finally {
			empty.close();
		}
	});
});

describe('getDrinkSlots', () => {
	it('returns only active slots of the drinks type for that weekday', () => {
		seedDrinkSlots(db, 12);
		// A morning pickup slot on the same weekday must not be returned.
		db.prepare(
			`INSERT INTO time_slots (day_of_week, start_time, end_time, capacity, active, slot_type)
			 VALUES (5,'07:00','08:00',5,1,'pickup')`
		).run();
		const slots = getDrinkSlots(db, FRI_CST);
		expect(slots).toHaveLength(1);
		expect(slots[0]).toMatchObject({ start_time: '14:45', end_time: '15:15' });
	});

	it('skips deactivated slots', () => {
		seedDrinkSlots(db, 12);
		db.prepare('UPDATE time_slots SET active = 0').run();
		expect(getDrinkSlots(db, FRI_CST)).toHaveLength(0);
	});

	it('returns nothing for a malformed date instead of throwing', () => {
		seedDrinkSlots(db, 12);
		expect(getDrinkSlots(db, 'garbage')).toEqual([]);
		expect(getSlotAvailability(db, 'garbage')).toEqual([]);
	});
});

describe('getSlotAvailability', () => {
	it('counts DRINKS, not reservation rows — the finding-5 regression', () => {
		seedDrinkSlots(db, 12);
		// ONE reservation for FOUR drinks must consume four of the twelve.
		seedReservation(db, FRI_CST, 4);
		const [slot] = getSlotAvailability(db, FRI_CST);
		expect(slot.available_drinks).toBe(8);
		expect(slot.sold_out).toBe(false);
	});

	it('reports sold_out at capacity', () => {
		seedDrinkSlots(db, 4);
		seedReservation(db, FRI_CST, 4);
		const [slot] = getSlotAvailability(db, FRI_CST);
		expect(slot.available_drinks).toBe(0);
		expect(slot.sold_out).toBe(true);
	});

	it('never reports negative availability', () => {
		seedDrinkSlots(db, 2);
		seedReservation(db, FRI_CST, 5);
		expect(getSlotAvailability(db, FRI_CST)[0].available_drinks).toBe(0);
	});

	it.each(CANCELLED_STATUSES)('frees capacity held by a %s reservation', (status) => {
		seedDrinkSlots(db, 12);
		seedReservation(db, FRI_CST, 4, status);
		expect(getSlotAvailability(db, FRI_CST)[0].available_drinks).toBe(12);
	});

	it('still counts pending reservations — an unpaid hold is a hold', () => {
		seedDrinkSlots(db, 12);
		seedReservation(db, FRI_CST, 3, 'pending');
		expect(getSlotAvailability(db, FRI_CST)[0].available_drinks).toBe(9);
	});

	it('applies the daily cap across slots, below the per-slot capacity', () => {
		// Two slots of 12 each, but a daily cap of 10.
		db.prepare(
			`INSERT INTO time_slots (day_of_week, start_time, end_time, capacity, active, slot_type, capacity_drinks)
			 VALUES (5,'15:30','16:00',0,1,?,12)`
		).run(DRINK_SLOT_TYPE);
		seedDrinkSlots(db, 12);
		setSettingOn(db, 'drinks_daily_cap', '10');
		seedReservation(db, FRI_CST, 7);
		// 3 left on the day, so neither slot may offer more than 3.
		for (const slot of getSlotAvailability(db, FRI_CST)) {
			expect(slot.available_drinks).toBeLessThanOrEqual(3);
		}
	});

	it('ignores reservations for other dates', () => {
		seedDrinkSlots(db, 12);
		seedReservation(db, '2026-11-19', 5);
		expect(getSlotAvailability(db, FRI_CST)[0].available_drinks).toBe(12);
	});

	it('ignores a non-drink reservation — a bakery pickup carries drink_count 0', () => {
		seedDrinkSlots(db, 12);
		db.prepare(`INSERT INTO reservations (reservation_date, time_slot, status) VALUES (?,?,?)`).run(
			FRI_CST,
			'09:00-10:00',
			'confirmed'
		);
		expect(getSlotAvailability(db, FRI_CST)[0].available_drinks).toBe(12);
	});

	it('keeps per-slot capacity separate but shares the daily cap between slots', () => {
		// Two drink windows on the same Friday, 12 per slot, daily cap 12.
		db.prepare(
			`INSERT INTO time_slots (day_of_week, start_time, end_time, capacity, active, slot_type, capacity_drinks)
			 VALUES (5,'15:30','16:00',0,1,?,12)`
		).run(DRINK_SLOT_TYPE);
		seedDrinkSlots(db, 12);
		seedReservation(db, FRI_CST, 4); // in the 14:45 window only

		const byLabel = Object.fromEntries(getSlotAvailability(db, FRI_CST).map((s) => [s.label, s]));
		// The 15:30 window has used none of its own 12 — but the DAY has only 8
		// left, and Deborah still has to make all of them, so it offers 8.
		expect(byLabel['15:30-16:00'].available_drinks).toBe(8);
		expect(byLabel[SLOT].available_drinks).toBe(8);
	});
});

describe('holdCapacity', () => {
	const base = { date: FRI_CST, timeSlot: SLOT, email: 'a@b.com', name: 'A', totalCents: 1000 };

	beforeEach(() => {
		seedDrinkSlots(db, 4);
	});

	it('inserts a pending reservation and consumes capacity', () => {
		const res = holdCapacity(db, { ...base, drinkCount: 3 });
		expect(res.ok).toBe(true);
		const row = db
			.prepare('SELECT status, drink_count FROM reservations WHERE id = ?')
			.get(res.reservationId) as { status: string; drink_count: number };
		expect(row.status).toBe('pending');
		expect(row.drink_count).toBe(3);
		expect(getSlotAvailability(db, FRI_CST)[0].available_drinks).toBe(1);
	});

	it('refuses to oversell and writes nothing when it refuses', () => {
		expect(holdCapacity(db, { ...base, drinkCount: 3 }).ok).toBe(true);
		const before = db.prepare('SELECT COUNT(*) c FROM reservations').get() as { c: number };
		const over = holdCapacity(db, { ...base, drinkCount: 2 });
		expect(over).toMatchObject({ ok: false, reason: 'slot_full' });
		const after = db.prepare('SELECT COUNT(*) c FROM reservations').get() as { c: number };
		expect(after.c).toBe(before.c);
	});

	it('allows a hold that exactly fills the slot', () => {
		expect(holdCapacity(db, { ...base, drinkCount: 4 }).ok).toBe(true);
		expect(getSlotAvailability(db, FRI_CST)[0].sold_out).toBe(true);
	});

	it('rejects a non-positive or absurd drink count', () => {
		expect(holdCapacity(db, { ...base, drinkCount: 0 })).toMatchObject({ ok: false });
		expect(holdCapacity(db, { ...base, drinkCount: -1 })).toMatchObject({ ok: false });
		expect(holdCapacity(db, { ...base, drinkCount: 1.5 })).toMatchObject({ ok: false });
	});

	it('rejects a slot that does not exist for that weekday', () => {
		expect(holdCapacity(db, { ...base, timeSlot: '23:00-23:30', drinkCount: 1 })).toMatchObject({
			ok: false,
			reason: 'no_such_slot'
		});
	});

	it('respects the daily cap even when the slot has room', () => {
		setSettingOn(db, 'drinks_daily_cap', '2');
		expect(holdCapacity(db, { ...base, drinkCount: 2 }).ok).toBe(true);
		expect(holdCapacity(db, { ...base, drinkCount: 1 })).toMatchObject({
			ok: false,
			reason: 'daily_cap_reached'
		});
	});

	it('works with only the required fields, defaulting the rest', () => {
		// PR4 may call this before it knows the email/total. The optional fields
		// must default rather than write NULL into NOT NULL-ish columns.
		const res = holdCapacity(db, { date: FRI_CST, timeSlot: SLOT, drinkCount: 1 });
		expect(res.ok).toBe(true);
		const row = db
			.prepare(
				'SELECT total_cents, customer_email, customer_name, items, stripe_session_id, pickup_location FROM reservations WHERE id = ?'
			)
			.get(res.reservationId) as Record<string, unknown>;
		expect(row.total_cents).toBe(0);
		expect(row.customer_email).toBe('');
		expect(row.customer_name).toBe('');
		expect(row.items).toBeNull();
		expect(row.stripe_session_id).toBeNull();
		expect(row.pickup_location).toBeNull();
	});

	it('is atomic across two connections — only one gets the last cup', () => {
		// Two connections to the same file stand in for the web and admin
		// processes. The guard must live in SQLite, not in per-process state.
		const path = join(dir, 'race.db');
		const a = freshDb(path);
		const b = new Database(path);
		try {
			seedDrinkSlots(a, 4);
			seedReservation(a, FRI_CST, 3);
			const resA = holdCapacity(a, { ...base, drinkCount: 1 });
			const resB = holdCapacity(b, { ...base, drinkCount: 1 });
			expect([resA.ok, resB.ok].filter(Boolean)).toHaveLength(1);
			const total = a
				.prepare(
					`SELECT COALESCE(SUM(drink_count),0) s FROM reservations
					 WHERE reservation_date = ? AND time_slot = ? AND status NOT IN ('cancelled','expired')`
				)
				.get(FRI_CST, SLOT) as { s: number };
			expect(total.s).toBe(4);
		} finally {
			a.close();
			b.close();
		}
	});
});

describe('releaseCapacity', () => {
	const base = { date: FRI_CST, timeSlot: SLOT, email: 'a@b.com', name: 'A', totalCents: 1000 };

	beforeEach(() => {
		seedDrinkSlots(db, 4);
	});

	it('frees the capacity of an abandoned session and marks it expired', () => {
		seedReservation(db, FRI_CST, 3, 'pending', 'cs_test_abandoned');
		expect(getSlotAvailability(db, FRI_CST)[0].available_drinks).toBe(1);
		expect(releaseCapacity(db, 'cs_test_abandoned')).toBe(1);
		expect(getSlotAvailability(db, FRI_CST)[0].available_drinks).toBe(4);
		const row = db
			.prepare('SELECT status FROM reservations WHERE stripe_session_id = ?')
			.get('cs_test_abandoned') as { status: string };
		expect(row.status).toBe('expired');
	});

	it('will not release a reservation that has already been paid', () => {
		seedReservation(db, FRI_CST, 3, 'confirmed', 'cs_test_paid');
		expect(releaseCapacity(db, 'cs_test_paid')).toBe(0);
		const row = db
			.prepare('SELECT status FROM reservations WHERE stripe_session_id = ?')
			.get('cs_test_paid') as { status: string };
		expect(row.status).toBe('confirmed');
	});

	it('is a no-op for an unknown session', () => {
		expect(releaseCapacity(db, 'cs_test_nope')).toBe(0);
	});

	it('is idempotent', () => {
		seedReservation(db, FRI_CST, 2, 'pending', 'cs_test_twice');
		expect(releaseCapacity(db, 'cs_test_twice')).toBe(1);
		expect(releaseCapacity(db, 'cs_test_twice')).toBe(0);
	});

	it('round-trips with holdCapacity', () => {
		const res = holdCapacity(db, { ...base, drinkCount: 4, sessionId: 'cs_test_rt' });
		expect(res.ok).toBe(true);
		expect(getSlotAvailability(db, FRI_CST)[0].sold_out).toBe(true);
		expect(releaseCapacity(db, 'cs_test_rt')).toBe(1);
		expect(getSlotAvailability(db, FRI_CST)[0].available_drinks).toBe(4);
	});

	it('ignores an empty session id', () => {
		expect(releaseCapacity(db, '')).toBe(0);
	});
});

describe('confirmReservation', () => {
	const base = { date: FRI_CST, timeSlot: SLOT, email: 'a@b.com', name: 'A', totalCents: 1000 };

	beforeEach(() => {
		seedDrinkSlots(db, 4);
	});

	it('promotes a pending reservation and returns it', () => {
		holdCapacity(db, { ...base, drinkCount: 2, sessionId: 'cs_ok' });
		const row = confirmReservation(db, 'cs_ok');
		expect(row).toMatchObject({
			customer_email: 'a@b.com',
			reservation_date: FRI_CST,
			time_slot: SLOT
		});
		const status = db
			.prepare('SELECT status FROM reservations WHERE stripe_session_id = ?')
			.get('cs_ok') as { status: string };
		expect(status.status).toBe('confirmed');
	});

	it('returns null on a duplicate webhook delivery, so no second email is sent', () => {
		holdCapacity(db, { ...base, drinkCount: 2, sessionId: 'cs_dup' });
		expect(confirmReservation(db, 'cs_dup')).not.toBeNull();
		expect(confirmReservation(db, 'cs_dup')).toBeNull();
	});

	it('returns null for an unknown session', () => {
		expect(confirmReservation(db, 'cs_unknown')).toBeNull();
	});

	it('returns null for an empty session id', () => {
		expect(confirmReservation(db, '')).toBeNull();
	});

	it('throws rather than email the wrong pickup time when two rows share a session', () => {
		// Two pending rows on one Stripe session id should be impossible. If it
		// ever happens, confirming them must not quietly pick one at random and
		// send that customer the other's pickup time.
		seedReservation(db, FRI_CST, 1, 'pending', 'cs_dupe_rows');
		seedReservation(db, FRI_CST, 1, 'pending', 'cs_dupe_rows');
		expect(() => confirmReservation(db, 'cs_dupe_rows')).toThrow(/share session/);
	});

	it('will not resurrect an expired reservation', () => {
		seedReservation(db, FRI_CST, 2, 'expired', 'cs_expired');
		expect(confirmReservation(db, 'cs_expired')).toBeNull();
	});

	it('still holds capacity after confirmation', () => {
		holdCapacity(db, { ...base, drinkCount: 3, sessionId: 'cs_hold' });
		confirmReservation(db, 'cs_hold');
		expect(getSlotAvailability(db, FRI_CST)[0].available_drinks).toBe(1);
	});
});

describe('drinksEnabled', () => {
	it('is false by default and true only for the exact string "1"', () => {
		expect(drinksEnabled(db)).toBe(false);
		setSettingOn(db, 'drinks_enabled', '1');
		expect(drinksEnabled(db)).toBe(true);
		setSettingOn(db, 'drinks_enabled', 'true');
		expect(drinksEnabled(db)).toBe(false);
		setSettingOn(db, 'drinks_enabled', '0');
		expect(drinksEnabled(db)).toBe(false);
	});
});

describe('refusalMessage', () => {
	const reasons: HoldReason[] = [
		'closed_day',
		'cutoff_passed',
		'date_past',
		'slot_full',
		'daily_cap_reached',
		'no_slots',
		'no_such_slot',
		'bad_drink_count',
		'bad_date'
	];

	it.each(reasons)('gives a non-empty customer-safe message for %s', (reason) => {
		const msg = refusalMessage(reason);
		expect(msg.length).toBeGreaterThan(0);
		// Must not leak the internal reason code to a customer.
		expect(msg).not.toContain('_');
	});

	it('falls back for an undefined reason', () => {
		expect(refusalMessage(undefined)).toMatch(/try again/i);
	});
});

describe('settings robustness', () => {
	it('falls back to the default cap when the setting is garbage', () => {
		seedDrinkSlots(db, 100);
		for (const bad of ['', '  ', 'abc', '-5', '1.5']) {
			setSettingOn(db, 'drinks_daily_cap', bad);
			// Default cap is 12, so a 100-capacity slot must still be held to 12.
			expect(getSlotAvailability(db, FRI_CST)[0].available_drinks).toBe(12);
		}
	});

	it('treats a slot with NULL capacity_drinks as zero rather than unlimited', () => {
		db.prepare(
			`INSERT INTO time_slots (day_of_week, start_time, end_time, capacity, active, slot_type, capacity_drinks)
			 VALUES (5,'16:00','16:30',0,1,?,NULL)`
		).run(DRINK_SLOT_TYPE);
		const slot = getSlotAvailability(db, FRI_CST).find((s) => s.label === '16:00-16:30');
		expect(slot?.available_drinks).toBe(0);
		expect(slot?.sold_out).toBe(true);
	});
});
