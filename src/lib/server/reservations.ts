import type Database from 'better-sqlite3';
import {
	DRINK_SLOT_TYPE,
	DRINKS_DEFAULT_CUTOFF_HOUR,
	DRINKS_DEFAULT_DAILY_CAP,
	DRINK_CATEGORY,
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
export const MAX_DRINKS_PER_ORDER = 50;

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

/** Reasons buildDrinkOrder can refuse an order. */
export type DrinkOrderReason = 'bad_items' | 'not_a_drink' | 'bad_drink_count';

/** Every reason any part of this module can refuse for. */
export type RefusalReason = HoldReason | OrderableReason | DrinkOrderReason;

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
	// One row per pickup WINDOW, not per table row. Nothing stops an operator
	// creating two slots with the same start and end time, and duplicates would
	// render the window twice AND misreport capacity: each copy would advertise
	// its own capacity while a single hold counts against both (holds are matched
	// by the "start-end" label, which the copies share).
	return db
		.prepare(
			`SELECT MIN(id) AS id, start_time, end_time, MAX(capacity_drinks) AS capacity_drinks
			 FROM time_slots
			 WHERE active = 1 AND slot_type = ? AND day_of_week = ?
			 GROUP BY start_time, end_time
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

export interface DrinkOrderItem {
	productId: number;
	quantity: number;
}

export interface DrinkLineItem {
	/** Kept so orders.items has the same shape as every other order path. */
	productId: number;
	name: string;
	price_cents: number;
	quantity: number;
}

export interface DrinkOrderResult {
	ok: boolean;
	lineItems?: DrinkLineItem[];
	drinkCount?: number;
	totalCents?: number;
	reason?: DrinkOrderReason;
}

/**
 * Validate a requested drink order and price it SERVER-SIDE.
 *
 * Prices come from the products table every time. The client's numbers are
 * never read — the only thing taken from the request is which product and how
 * many, both of which are re-checked here.
 *
 * Only `active = 1` rows in the drinks category qualify, so turning a drink off
 * in the admin immediately stops it being orderable.
 */
export function buildDrinkOrder(db: Database.Database, items: unknown): DrinkOrderResult {
	if (!Array.isArray(items) || items.length === 0) return { ok: false, reason: 'bad_items' };

	const lineItems: DrinkLineItem[] = [];
	let drinkCount = 0;

	for (const raw of items) {
		if (!raw || typeof raw !== 'object') return { ok: false, reason: 'bad_items' };
		const { productId, quantity } = raw as Partial<DrinkOrderItem>;
		if (!Number.isInteger(productId) || (productId as number) <= 0) {
			return { ok: false, reason: 'bad_items' };
		}
		if (!Number.isInteger(quantity) || (quantity as number) <= 0) {
			return { ok: false, reason: 'bad_drink_count' };
		}

		const product = db
			.prepare(
				'SELECT id, name, price_cents FROM products WHERE id = ? AND category = ? AND active = 1'
			)
			.get(productId, DRINK_CATEGORY) as
			| { id: number; name: string; price_cents: number }
			| undefined;
		if (!product) return { ok: false, reason: 'not_a_drink' };

		lineItems.push({
			productId: product.id,
			name: product.name,
			price_cents: product.price_cents,
			quantity: quantity as number
		});
		drinkCount += quantity as number;
	}

	if (drinkCount <= 0 || drinkCount > MAX_DRINKS_PER_ORDER) {
		return { ok: false, reason: 'bad_drink_count' };
	}

	const totalCents = lineItems.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
	return { ok: true, lineItems, drinkCount, totalCents };
}

/** Attach the Stripe session to a hold created before the session existed. */
export function attachSessionToReservation(
	db: Database.Database,
	reservationId: number,
	sessionId: string
): void {
	db.prepare('UPDATE reservations SET stripe_session_id = ? WHERE id = ?').run(
		sessionId,
		reservationId
	);
}

/** Drop a hold outright. Used when session creation fails after the hold. */
export function abandonHold(db: Database.Database, reservationId: number): void {
	db.prepare(
		"UPDATE reservations SET status = 'cancelled' WHERE id = ? AND status = 'pending'"
	).run(reservationId);
}

/** Full reservation row, for the confirmation emails. */
export function getReservationBySession(db: Database.Database, sessionId: string) {
	if (!sessionId) return null;
	return (
		(db
			.prepare('SELECT * FROM reservations WHERE stripe_session_id = ? ORDER BY id DESC LIMIT 1')
			.get(sessionId) as Record<string, unknown> | undefined) ?? null
	);
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

/** What confirming a paid session actually did. */
export type ConfirmOutcome = 'confirmed' | 'already_confirmed' | 'revived' | 'not_found';

export interface ConfirmResult {
	outcome: ConfirmOutcome;
	row?: {
		id: number;
		customer_email: string;
		reservation_date: string;
		time_slot: string;
	};
}

/**
 * Promote a paid reservation to `confirmed`.
 *
 * The three non-happy cases are reported separately because they mean very
 * different things and an earlier version conflated them all as "null":
 *
 * - `already_confirmed` — a duplicate webhook delivery. Do NOT email again.
 * - `revived` — the row had been cancelled or expired, yet Stripe says it was
 *   PAID. Money has been taken, so the reservation is honoured anyway and the
 *   caller must shout about it: capacity may now be over-committed.
 * - `not_found` — no reservation for that session; not a drink order.
 */
export function confirmReservation(db: Database.Database, sessionId: string): ConfirmResult {
	if (!sessionId) return { outcome: 'not_found' };

	const run = db.transaction((): ConfirmResult => {
		const rows = db
			.prepare('SELECT id, status FROM reservations WHERE stripe_session_id = ? ORDER BY id DESC')
			.all(sessionId) as { id: number; status: string }[];
		if (rows.length === 0) return { outcome: 'not_found' };
		if (rows.length > 1) {
			// Two rows must never share a Stripe session id. Confirm the newest
			// deterministically rather than throw: throwing would 500 the webhook and
			// Stripe would retry forever. But make the anomaly loud.
			console.error(
				`confirmReservation: ${rows.length} reservations share session ${sessionId}; confirming id ${rows[0].id}`
			);
		}
		const existing = rows[0];
		if (existing.status === 'confirmed') return { outcome: 'already_confirmed' };

		const wasReleased = (CANCELLED_STATUSES as readonly string[]).includes(existing.status);

		const result = db
			.prepare("UPDATE reservations SET status = 'confirmed' WHERE id = ?")
			.run(existing.id);
		if (result.changes !== 1) return { outcome: 'not_found' };

		const row = db
			.prepare(
				`SELECT id, customer_email, reservation_date, time_slot
				 FROM reservations WHERE id = ?`
			)
			.get(existing.id) as ConfirmResult['row'];

		return { outcome: wasReleased ? 'revived' : 'confirmed', row };
	});

	return run.immediate();
}

/** Whether drink reservations are switched on at all. */
export function drinksEnabled(db: Database.Database): boolean {
	return getSettingOn(db, SETTINGS.drinksEnabled) === '1';
}

/** Customer-facing message for a refusal. Never leaks internals. */
export function refusalMessage(reason: RefusalReason | undefined): string {
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
			return `Please choose at least one drink, and no more than ${MAX_DRINKS_PER_ORDER}.`;
		case 'not_a_drink':
			return 'One of those items is not available to reserve.';
		case 'bad_items':
			return 'Please choose at least one drink.';
		default:
			return 'We could not reserve that. Please try again.';
	}
}
