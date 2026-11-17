import { getDb, getSettingOn, DRINK_CATEGORY, SETTINGS } from '$lib/server/db';
import {
	MAX_DRINKS_PER_ORDER,
	drinksEnabled,
	getDrinkSlots,
	isDateOrderable,
	refusalMessage,
	todayInChicago
} from '$lib/server/reservations';

/** How far ahead a customer may book. */
const DAYS_AHEAD = 14;

/** Days shown as choices; beyond this the list stops being useful on a phone. */
const MAX_DAYS_SHOWN = 7;

export interface DayOption {
	date: string;
	/** "Thu, Nov 20" */
	label: string;
	/** "Thursday" */
	weekday: string;
	orderable: boolean;
	/** Customer-facing reason when not orderable. */
	reason: string | null;
}

function addDays(dateStr: string, n: number): string {
	const [y, m, d] = dateStr.split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d + n));
	return dt.toISOString().slice(0, 10);
}

function labelFor(dateStr: string): { label: string; weekday: string } {
	const [y, m, d] = dateStr.split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	return {
		label: dt.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC'
		}),
		weekday: dt.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
	};
}

export function load() {
	const db = getDb();
	const enabled = drinksEnabled(db);

	if (!enabled) {
		return {
			enabled: false,
			drinks: [],
			days: [] as DayOption[],
			pickupLocation: '',
			maxDrinks: MAX_DRINKS_PER_ORDER
		};
	}

	const drinks = db
		.prepare(
			'SELECT id, name, description, price_cents FROM products WHERE category = ? AND active = 1 ORDER BY price_cents, name'
		)
		.all(DRINK_CATEGORY) as {
		id: number;
		name: string;
		description: string | null;
		price_cents: number;
	}[];

	// Only offer days that actually have a drink window configured. A day whose
	// cutoff has passed is still listed, disabled, with the reason — hiding it
	// just makes the customer wonder where Thursday went.
	const now = new Date();
	const today = todayInChicago(now);
	const days: DayOption[] = [];
	for (let i = 0; i < DAYS_AHEAD && days.length < MAX_DAYS_SHOWN; i++) {
		const date = addDays(today, i);
		if (getDrinkSlots(db, date).length === 0) continue;
		const check = isDateOrderable(db, date, now);
		days.push({
			date,
			...labelFor(date),
			orderable: check.ok,
			reason: check.ok ? null : refusalMessage(check.reason)
		});
	}

	return {
		enabled: true,
		drinks,
		days,
		pickupLocation: getSettingOn(db, SETTINGS.drinksPickupLocation) ?? '',
		// The server caps the whole ORDER, not each product, so the page needs the
		// real number to clamp against rather than hardcoding it.
		maxDrinks: MAX_DRINKS_PER_ORDER
	};
}
