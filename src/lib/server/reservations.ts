import type Database from 'better-sqlite3';
import {
	DRINK_SLOT_TYPE,
	DRINKS_DEFAULT_CUTOFF_HOUR,
	DRINKS_DEFAULT_DAILY_CAP,
	SETTINGS,
	getIntSettingOn,
	getSettingOn
} from './db';

/**
 * Drink reservation capacity engine.
 *
 * Two things in here are easy to get wrong and are therefore done explicitly:
 *
 * 1. Capacity is counted in DRINKS, never in reservation rows. One customer
 *    ordering four lattes consumes four of the slot.
 * 2. Every date and cutoff comparison is done in America/Chicago. The VPS runs
 *    UTC, and this project has already shipped a timezone bug once (the datasync
 *    cron silently ran six hours early because Debian cron ignores CRON_TZ).
 */

const TIME_ZONE = 'America/Chicago';

/** Statuses that do NOT hold capacity. Everything else does, `pending` included. */
export const CANCELLED_STATUSES = ['cancelled', 'expired'] as const;

/**
 * SQL fragment for "this reservation still holds capacity", derived from
 * CANCELLED_STATUSES so adding a status (a future 'refunded', say) actually
 * changes behaviour instead of silently doing nothing.
 *
 * Interpolated as literals rather than bound parameters because these are
 * compile-time constants from this module — never user input — and that keeps
 * the positional parameters of the guarded INSERT readable.
 */
const HOLDS_CAPACITY_SQL = `status NOT IN (${CANCELLED_STATUSES.map((s) => `'${s}'`).join(', ')})`;

const WEEKDAYS = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday'
] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a `YYYY-MM-DD` calendar date, returning null unless it is a REAL date.
 *
 * The regex alone is not enough: Date.UTC silently rolls over, so '2026-13-01'
 * becomes January 2027 and '2026-02-30' becomes March 2. Checking only the day
 * of the month misses the first case, because the day still matches. All three
 * components have to round-trip.
 */
function parseCalendarDate(dateStr: string): { y: number; m: number; d: number; utc: Date } | null {
	if (!DATE_RE.test(dateStr)) return null;
	const [y, m, d] = dateStr.split('-').map(Number);
	const utc = new Date(Date.UTC(y, m - 1, d));
	if (Number.isNaN(utc.getTime())) return null;
	if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) {
		return null;
	}
	return { y, m, d, utc };
}

/** Upper bound on one order, so a typo or a bot cannot ask for 10,000 lattes. */
const MAX_DRINKS_PER_ORDER = 50;

export type OrderableReason =
	| 'bad_date'
	| 'closed_day'
	| 'cutoff_passed'
	| 'date_past'
	| 'no_slots';

export type HoldReason =
	| OrderableReason
	| 'bad_drink_count'
	| 'no_such_slot'
	| 'slot_full'
	| 'daily_cap_reached';

export interface DrinkSlot {
	id: number;
	start_time: string;
	end_time: string;
	capacity_drinks: number | null;
}

export interface SlotAvailability extends DrinkSlot {
	label: string;
	available_drinks: number;
	sold_out: boolean;
}

/**
 * Offset of America/Chicago from UTC, in minutes, at a given instant.
 * Negative west of Greenwich: -360 for CST, -300 for CDT.
 */
export function chicagoOffsetMinutes(instant: Date): number {
	const name = new Intl.DateTimeFormat('en-US', {
		timeZone: TIME_ZONE,
		timeZoneName: 'longOffset'
	})
		.formatToParts(instant)
		.find((p) => p.type === 'timeZoneName')?.value;
	// "GMT-06:00" / "GMT-5" / "GMT"
	const match = name?.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
	if (!match) {
		// Returning 0 here would place the cutoff 5-6 hours late and keep ordering
		// open into the pickup day — a plausible wrong number is worse than a loud
		// failure, especially in this codebase's timezone history.
		throw new Error(`Could not resolve the ${TIME_ZONE} offset (got ${String(name)})`);
	}
	const sign = match[1] === '-' ? -1 : 1;
	return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

/** The calendar date in Chicago at a given instant, as `YYYY-MM-DD`. */
export function todayInChicago(now: Date): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(now);
	// en-CA already formats as YYYY-MM-DD.
	return parts;
}

/**
 * Weekday name of a calendar date. A calendar date's weekday does not depend on
 * a timezone, so this is computed from the date parts directly.
 */
export function weekdayOf(dateStr: string): string {
	const parsed = parseCalendarDate(dateStr);
	if (!parsed) return '';
	return WEEKDAYS[parsed.utc.getUTCDay()];
}

/**
 * The instant at which ordering closes for `dateStr`: `cutoffHour`:00 Chicago
 * time on the preceding day.
 *
 * Converting a Chicago wall-clock time to an instant needs the offset that is in
 * force *at that instant*, which is what we are solving for. Guess using the
 * offset at the naive UTC interpretation, then re-resolve once — that settles
 * every case except a wall time inside a DST gap, which 20:00 never is.
 */
export function orderCutoffInstant(dateStr: string, cutoffHour: number): Date | null {
	const parsed = parseCalendarDate(dateStr);
	if (!parsed) return null;
	const { y, m, d } = parsed;
	const naive = Date.UTC(y, m - 1, d - 1, clampHour(cutoffHour), 0, 0, 0);
	let instant = naive - chicagoOffsetMinutes(new Date(naive)) * 60_000;
	instant = naive - chicagoOffsetMinutes(new Date(instant)) * 60_000;
	return new Date(instant);
}

function orderDays(db: Database.Database): string[] {
	const raw = getSettingOn(db, SETTINGS.drinksOrderDays) ?? '';
	return raw
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
}

/**
 * Hours in a day. A `drinks_cutoff_hour` of 200 is not merely odd: it makes
 * Date.UTC roll the cutoff ~8 days PAST the pickup date, so `now >= cutoff` is
 * never true and same-day ordering becomes possible — defeating the overnight
 * cold-brew steep the cutoff exists to protect.
 */
const HOURS_IN_DAY = 24;

function clampHour(hour: number): number {
	if (!Number.isInteger(hour) || hour < 0 || hour >= HOURS_IN_DAY) {
		return DRINKS_DEFAULT_CUTOFF_HOUR;
	}
	return hour;
}

/** The configured cutoff hour, guaranteed to be a real hour of the day. */
export function cutoffHourFor(db: Database.Database): number {
	return clampHour(getIntSettingOn(db, SETTINGS.drinksCutoffHour, DRINKS_DEFAULT_CUTOFF_HOUR));
}

function dailyCap(db: Database.Database): number {
	return getIntSettingOn(db, SETTINGS.drinksDailyCap, DRINKS_DEFAULT_DAILY_CAP);
}

/** Drinks already held for a date across every slot. */
function drinksHeldOnDate(db: Database.Database, dateStr: string): number {
	const row = db
		.prepare(
			`SELECT COALESCE(SUM(drink_count), 0) AS held FROM reservations
			 WHERE reservation_date = ? AND ${HOLDS_CAPACITY_SQL}`
		)
		.get(dateStr) as { held: number };
	return row.held;
}

/** Drinks already held for one slot on a date. */
function drinksHeldInSlot(db: Database.Database, dateStr: string, timeSlot: string): number {
	const row = db
		.prepare(
			`SELECT COALESCE(SUM(drink_count), 0) AS held FROM reservations
			 WHERE reservation_date = ? AND time_slot = ?
			   AND ${HOLDS_CAPACITY_SQL}`
		)
		.get(dateStr, timeSlot) as { held: number };
	return row.held;
}

/** Active drink slots for the weekday of `dateStr`. */
export function getDrinkSlots(db: Database.Database, dateStr: string): DrinkSlot[] {
	const parsed = parseCalendarDate(dateStr);
	if (!parsed) return [];
	const dow = parsed.utc.getUTCDay();
	return db
		.prepare(
			`SELECT id, start_time, end_time, capacity_drinks FROM time_slots
			 WHERE active = 1 AND slot_type = ? AND day_of_week = ?
			 ORDER BY start_time`
		)
		.all(DRINK_SLOT_TYPE, dow) as DrinkSlot[];
}

export function slotLabel(slot: { start_time: string; end_time: string }): string {
	return `${slot.start_time}-${slot.end_time}`;
}

/**
 * Remaining drinks per slot for a date, with the day-level cap applied on top:
 * a slot can never offer more than the whole day has left.
 */
export function getSlotAvailability(db: Database.Database, dateStr: string): SlotAvailability[] {
	const slots = getDrinkSlots(db, dateStr);
	if (slots.length === 0) return [];

	const dayRemaining = Math.max(0, dailyCap(db) - drinksHeldOnDate(db, dateStr));

	return slots.map((slot) => {
		const label = slotLabel(slot);
		const perSlotCap = slot.capacity_drinks ?? 0;
		const slotRemaining = Math.max(0, perSlotCap - drinksHeldInSlot(db, dateStr, label));
		const available = Math.min(slotRemaining, dayRemaining);
		return {
			...slot,
			label,
			available_drinks: available,
			sold_out: available <= 0
		};
	});
}

/** Whether `dateStr` can still be ordered for, as of `now`. */
export function isDateOrderable(
	db: Database.Database,
	dateStr: string,
	now: Date
): { ok: boolean; reason?: OrderableReason } {
	if (!parseCalendarDate(dateStr)) return { ok: false, reason: 'bad_date' };
	if (dateStr < todayInChicago(now)) return { ok: false, reason: 'date_past' };
	if (!orderDays(db).includes(weekdayOf(dateStr))) return { ok: false, reason: 'closed_day' };
	if (getDrinkSlots(db, dateStr).length === 0) return { ok: false, reason: 'no_slots' };
	const cutoff = orderCutoffInstant(dateStr, cutoffHourFor(db));
	if (!cutoff) return { ok: false, reason: 'bad_date' };
	if (now.getTime() >= cutoff.getTime()) {
		return { ok: false, reason: 'cutoff_passed' };
	}
	return { ok: true };
}

export interface HoldParams {
	date: string;
	timeSlot: string;
	drinkCount: number;
	email?: string;
	name?: string;
	totalCents?: number;
	items?: string;
	sessionId?: string | null;
	pickupLocation?: string | null;
}

export interface HoldResult {
	ok: boolean;
	reservationId?: number;
	reason?: HoldReason;
}

/**
 * Reserve `drinkCount` drinks in a slot, as a single `pending` reservation.
 *
 * The capacity check and the insert are ONE statement — an `INSERT ... SELECT`
 * guarded by two correlated subqueries — so there is no read-then-write gap for
 * two customers to slip through. This mirrors the drops branch in
 * api/checkout/+server.ts, which guards its decrement inside the UPDATE rather
 * than reading first; the difference is only that drink capacity is derived by
 * SUM() instead of stored in a counter column.
 *
 * `.immediate()` takes the write lock up front, because the admin container is a
 * second process on the same database file.
 *
 * Does NOT check the ordering cutoff, and does NOT check the `drinks_enabled`
 * kill switch. Callers must check BOTH — isDateOrderable() for the cutoff and
 * drinksEnabled() for the switch — before holding. This function's job is
 * capacity alone, because the caller needs those failures reported distinctly.
 */
export function holdCapacity(db: Database.Database, params: HoldParams): HoldResult {
	const { date, timeSlot, drinkCount } = params;

	if (!Number.isInteger(drinkCount) || drinkCount <= 0 || drinkCount > MAX_DRINKS_PER_ORDER) {
		return { ok: false, reason: 'bad_drink_count' };
	}
	if (!parseCalendarDate(date)) return { ok: false, reason: 'bad_date' };

	const slot = getDrinkSlots(db, date).find((s) => slotLabel(s) === timeSlot);
	if (!slot) return { ok: false, reason: 'no_such_slot' };

	const perSlotCap = slot.capacity_drinks ?? 0;
	const cap = dailyCap(db);

	const run = db.transaction((): HoldResult => {
		const result = db
			.prepare(
				`INSERT INTO reservations
				   (reservation_date, time_slot, drink_count, total_cents, status,
				    stripe_session_id, customer_name, customer_email, items, pickup_location)
				 SELECT ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?
				 WHERE (
				   SELECT COALESCE(SUM(drink_count), 0) FROM reservations
				   WHERE reservation_date = ? AND time_slot = ?
				     AND ${HOLDS_CAPACITY_SQL}
				 ) + ? <= ?
				 AND (
				   SELECT COALESCE(SUM(drink_count), 0) FROM reservations
				   WHERE reservation_date = ?
				     AND ${HOLDS_CAPACITY_SQL}
				 ) + ? <= ?`
			)
			.run(
				date,
				timeSlot,
				drinkCount,
				params.totalCents ?? 0,
				params.sessionId ?? null,
				params.name ?? '',
				params.email ?? '',
				params.items ?? null,
				params.pickupLocation ?? null,
				date,
				timeSlot,
				drinkCount,
				perSlotCap,
				date,
				drinkCount,
				cap
			);

		if (result.changes === 1) {
			return { ok: true, reservationId: Number(result.lastInsertRowid) };
		}

		// Nothing was written. Work out which limit refused it, for the message.
		const dayWouldBe = drinksHeldOnDate(db, date) + drinkCount;
		return { ok: false, reason: dayWouldBe > cap ? 'daily_cap_reached' : 'slot_full' };
	});

	return run.immediate();
}

/**
 * Release the capacity held by an abandoned checkout and mark it `expired`.
 *
 * Only ever touches a `pending` row, so a Stripe `checkout.session.expired`
 * arriving after a late `checkout.session.completed` cannot cancel a paid
 * reservation. Returns the number of reservations released (0 or 1), which makes
 * it idempotent and safe to call on webhook retries.
 */
export function releaseCapacity(db: Database.Database, sessionId: string): number {
	if (!sessionId) return 0;
	const result = db
		.prepare(
			`UPDATE reservations SET status = 'expired'
			 WHERE stripe_session_id = ? AND status = 'pending'`
		)
		.run(sessionId);
	return result.changes;
}

/**
 * Promote a paid reservation to `confirmed`. Returns the row, or null when there
 * is nothing to confirm — an unknown session, or one already confirmed, so a
 * duplicate webhook delivery does not send a second confirmation email.
 */
export function confirmReservation(
	db: Database.Database,
	sessionId: string
): { id: number; customer_email: string; reservation_date: string; time_slot: string } | null {
	if (!sessionId) return null;
	const run = db.transaction(() => {
		const result = db
			.prepare(
				`UPDATE reservations SET status = 'confirmed'
				 WHERE stripe_session_id = ? AND status = 'pending'`
			)
			.run(sessionId);
		if (result.changes === 0) return null;
		if (result.changes > 1) {
			// Two rows should never share a Stripe session id. If they ever do,
			// fail loudly rather than email one customer another's pickup time.
			throw new Error(
				`confirmReservation: ${result.changes} reservations share session ${sessionId}`
			);
		}
		return db
			.prepare(
				`SELECT id, customer_email, reservation_date, time_slot
				 FROM reservations
				 WHERE stripe_session_id = ? AND status = 'confirmed'
				 ORDER BY id DESC LIMIT 1`
			)
			.get(sessionId) as {
			id: number;
			customer_email: string;
			reservation_date: string;
			time_slot: string;
		};
	});
	return run.immediate();
}

/** Whether drink reservations are switched on at all. */
export function drinksEnabled(db: Database.Database): boolean {
	return getSettingOn(db, SETTINGS.drinksEnabled) === '1';
}

/** Customer-facing message for a refusal. Never leaks internals. */
export function refusalMessage(reason: HoldReason | OrderableReason | undefined): string {
	switch (reason) {
		case 'closed_day':
			return 'We are not making drinks that day.';
		case 'cutoff_passed':
			return 'Ordering for that day has closed. Please pick a later day.';
		case 'date_past':
			return 'That day has already passed.';
		case 'slot_full':
			return 'That pickup time just filled up. Please choose another time.';
		case 'daily_cap_reached':
			return 'We are fully booked for that day. Please choose another day.';
		case 'no_slots':
		case 'no_such_slot':
			return 'That pickup time is not available.';
		case 'bad_drink_count':
			return 'Please choose at least one drink.';
		default:
			return 'We could not reserve that. Please try again.';
	}
}
