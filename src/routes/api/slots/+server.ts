import { json } from '@sveltejs/kit';
import { getDb, getSettingOn, SETTINGS } from '$lib/server/db';
import {
	CANCELLED_STATUSES,
	cutoffHourFor,
	drinksEnabled,
	getSlotAvailability,
	isDateOrderable,
	orderCutoffInstant,
	refusalMessage
} from '$lib/server/reservations';

/**
 * Pickup / reservation slot availability.
 *
 * `?type=drinks` returns the drink-reservation view: capacity counted in DRINKS
 * and the ordering cutoff evaluated in America/Chicago.
 *
 * Without `type=drinks` the original pickup behaviour is kept. Note that the
 * legacy branch counts reservation ROWS against `capacity`, which is right for a
 * "one booking per head" pickup slot and wrong for drinks — which is exactly why
 * drinks get their own path instead of a change of meaning here.
 */

interface DrinksSlotView {
	label: string;
	start_time: string;
	end_time: string;
	available_drinks: number;
	sold_out: boolean;
}

interface DrinksResponse {
	enabled: boolean;
	date: string | null;
	orderable: boolean;
	reason: string | null;
	message: string | null;
	cutoff: string | null;
	pickup_location: string;
	slots: DrinksSlotView[];
}

/** One shape for every exit, so clients never read an undefined field. */
function drinksResponse(partial: Partial<DrinksResponse>): DrinksResponse {
	return {
		enabled: false,
		date: null,
		orderable: false,
		reason: null,
		message: null,
		cutoff: null,
		pickup_location: '',
		slots: [],
		...partial
	};
}

export function GET({ url }) {
	const db = getDb();
	const date = url.searchParams.get('date');

	if (url.searchParams.get('type') === 'drinks') {
		const enabled = drinksEnabled(db);
		if (!enabled || !date) {
			return json(drinksResponse({ enabled, date }));
		}

		const orderable = isDateOrderable(db, date, new Date());

		// orderCutoffInstant returns null for a date that is not a real calendar
		// date. Calling .getTime() or formatting it would throw a RangeError out
		// of Intl and turn a bad query string into a 500.
		const cutoff = orderCutoffInstant(date, cutoffHourFor(db));

		const slots: DrinksSlotView[] = orderable.ok
			? getSlotAvailability(db, date).map((s) => ({
					label: s.label,
					start_time: s.start_time,
					end_time: s.end_time,
					available_drinks: s.available_drinks,
					sold_out: s.sold_out
				}))
			: [];

		return json(
			drinksResponse({
				enabled: true,
				date,
				orderable: orderable.ok,
				reason: orderable.reason ?? null,
				message: orderable.ok ? null : refusalMessage(orderable.reason),
				cutoff: cutoff ? cutoff.toISOString() : null,
				pickup_location: getSettingOn(db, SETTINGS.drinksPickupLocation) ?? '',
				slots
			})
		);
	}

	// ---- Legacy pickup-slot behaviour ----
	if (!date) {
		const slots = db
			.prepare('SELECT * FROM time_slots WHERE active = 1 ORDER BY day_of_week, start_time')
			.all();
		return json(slots);
	}

	const dayOfWeek = new Date(date + 'T12:00:00').getDay();
	const slots = db
		.prepare('SELECT * FROM time_slots WHERE active = 1 AND day_of_week = ? ORDER BY start_time')
		.all(dayOfWeek);

	// Count existing reservations against each slot's capacity.
	//
	// This excludes every status that does not hold capacity, not just
	// 'cancelled' as it used to. Drink reservations introduced 'expired' into
	// this shared table, and an expired row whose time_slot label happens to
	// match a pickup slot would otherwise occupy a pickup seat forever.
	const releasedList = CANCELLED_STATUSES.map(() => '?').join(', ');
	const slotsWithAvailability = (slots as Record<string, unknown>[]).map((slot) => {
		const reserved = db
			.prepare(
				`SELECT COUNT(*) as count FROM reservations
				 WHERE reservation_date = ? AND time_slot = ?
				   AND status NOT IN (${releasedList})`
			)
			.get(date, `${slot.start_time}-${slot.end_time}`, ...CANCELLED_STATUSES) as {
			count: number;
		};
		return { ...slot, available: (slot.capacity as number) - reserved.count };
	});

	return json(slotsWithAvailability);
}
