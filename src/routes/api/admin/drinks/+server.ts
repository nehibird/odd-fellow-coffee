import { json, error } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { getDb, getSettingOn, SETTINGS } from '$lib/server/db';
import {
	CANCELLED_STATUSES,
	getSlotAvailability,
	slotLabel,
	todayInChicago
} from '$lib/server/reservations';

/**
 * The run sheet: what Deborah actually has to make on a given day.
 *
 * Grouped by pickup window, with a per-drink breakdown and the customer list,
 * because the question at 6am is "how many of each, and by when" — not "list
 * the orders".
 *
 * Only CONFIRMED reservations count toward what to brew. A `pending` row is an
 * unpaid hold that may still evaporate, so it is reported separately rather
 * than folded into the totals Deborah batches against.
 */
export function GET({ url, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');

	const db = getDb();
	const date = url.searchParams.get('date') || todayInChicago(new Date());

	const rows = db
		.prepare(
			`SELECT id, time_slot, drink_count, total_cents, status, customer_name, customer_email,
			        items, pickup_location, picked_up_at, no_show, created_at
			   FROM reservations
			  WHERE reservation_date = ?
			  ORDER BY time_slot, id`
		)
		.all(date) as Record<string, unknown>[];

	type DrinkTally = Record<string, number>;

	function tallyFrom(items: unknown): DrinkTally {
		const tally: DrinkTally = {};
		try {
			const parsed = JSON.parse(String(items ?? '[]'));
			if (Array.isArray(parsed)) {
				for (const line of parsed) {
					const name = String(line?.name ?? 'Drink');
					// `?? 0` only catches null/undefined. A non-numeric quantity from a
					// legacy or hand-edited blob yields NaN, and NaN then poisons every
					// later addition — so the printed sheet would read "NaN Iced Latte"
					// on the one document whose job is to say how many to make.
					const qty = Number(line?.quantity);
					tally[name] = (tally[name] ?? 0) + (Number.isFinite(qty) ? qty : 0);
				}
			}
		} catch {
			// A row with unreadable items still counts in drink_count; it just
			// cannot be broken down by drink.
		}
		return tally;
	}

	const released = new Set<string>(CANCELLED_STATUSES);
	const slots = new Map<
		string,
		{
			label: string;
			confirmed_drinks: number;
			pending_drinks: number;
			tally: DrinkTally;
			reservations: Record<string, unknown>[];
		}
	>();

	let dayConfirmed = 0;
	let dayPending = 0;
	let dayRevenueCents = 0;

	for (const row of rows) {
		const label = String(row.time_slot);
		if (!slots.has(label)) {
			slots.set(label, {
				label,
				confirmed_drinks: 0,
				pending_drinks: 0,
				tally: {},
				reservations: []
			});
		}
		const slot = slots.get(label)!;
		const status = String(row.status);
		const count = Number(row.drink_count ?? 0);

		// Cancelled and expired rows are excluded entirely: they are not customers
		// to hand a drink to, and printing them makes the list longer than the
		// drinks actually being made.
		if (released.has(status)) continue;

		slot.reservations.push({ ...row, drinks: tallyFrom(row.items) });

		if (status === 'confirmed') {
			slot.confirmed_drinks += count;
			dayConfirmed += count;
			dayRevenueCents += Number(row.total_cents ?? 0);
			for (const [name, qty] of Object.entries(tallyFrom(row.items))) {
				slot.tally[name] = (slot.tally[name] ?? 0) + qty;
			}
		} else {
			slot.pending_drinks += count;
			dayPending += count;
		}
	}

	// One pass: this does a slot query plus a day-wide and a per-slot SUM, so
	// calling it twice doubled the query count for no reason.
	const availability = getSlotAvailability(db, date);

	// Include configured windows with nothing booked, so a quiet slot reads as
	// "0 of 12" rather than vanishing from the sheet.
	for (const s of availability) {
		const label = slotLabel(s);
		if (!slots.has(label)) {
			slots.set(label, {
				label,
				confirmed_drinks: 0,
				pending_drinks: 0,
				tally: {},
				reservations: []
			});
		}
	}

	const capacityByLabel = new Map(availability.map((s) => [slotLabel(s), s.capacity_drinks ?? 0]));

	return json({
		date,
		pickup_location: getSettingOn(db, SETTINGS.drinksPickupLocation) ?? '',
		day_total_drinks: dayConfirmed,
		day_pending_drinks: dayPending,
		day_revenue_cents: dayRevenueCents,
		slots: [...slots.values()]
			.sort((a, b) => a.label.localeCompare(b.label))
			.map((s) => ({ ...s, capacity_drinks: capacityByLabel.get(s.label) ?? null }))
	});
}
