import { json, error } from '@sveltejs/kit';
import {
	getDb,
	getSettingOn,
	setSettingOn,
	getIntSettingOn,
	DRINKS_DEFAULT_DAILY_CAP,
	SETTINGS
} from '$lib/server/db';
import { env } from '$env/dynamic/private';
import { isAuthenticated } from '$lib/server/auth';
import { sendOwnerRunSheet, sendPickupReminder } from '$lib/server/email';
import {
	DEFAULT_STALE_HOLD_MINUTES,
	drinksEnabled,
	sweepStaleHolds,
	todayInChicago
} from '$lib/server/reservations';

/**
 * Drink reservation housekeeping. Called by n8n.
 *
 * Three jobs, selected with `?job=`:
 *
 *   sweep     — release unpaid holds that have gone stale. Capacity is taken
 *               before payment, and Stripe's expiry webhook is the only other
 *               backstop, so this is what stops an abandoned checkout parking a
 *               scarce drink. Cheap; run it often.
 *   reminders — the owner's morning run sheet plus a pickup-day nudge to every
 *               customer with drinks today. Run once in the morning.
 *   all       — both (the default).
 *
 * Auth: `?secret=<CRON_SECRET>`, falling back to an admin session — the same
 * shape the existing daily-digest endpoint uses.
 *
 * Note the date is resolved in America/Chicago, NOT UTC. The VPS runs UTC, so
 * `new Date().toISOString()` would roll over to tomorrow at 6pm Tonkawa time.
 */
/** Date of the last owner run sheet, so it is mailed at most once a day. */
const RUN_SHEET_SENT_KEY = 'drinks_run_sheet_sent_date';

export async function POST({ url, cookies }) {
	const secret = url.searchParams.get('secret');
	const cronSecret = env.CRON_SECRET;
	if (cronSecret && secret === cronSecret) {
		// Valid cron secret — proceed.
	} else if (!isAuthenticated(cookies)) {
		throw error(401, 'Unauthorized');
	}

	const job = url.searchParams.get('job') ?? 'all';
	if (!['sweep', 'reminders', 'all'].includes(job)) {
		throw error(400, 'job must be sweep, reminders or all.');
	}

	const db = getDb();
	const today = todayInChicago(new Date());
	const result: Record<string, unknown> = { date: today, job };

	// The sweep runs even when drinks are switched off: holds taken before the
	// switch was flipped still need giving back.
	if (job === 'sweep' || job === 'all') {
		result.released = sweepStaleHolds(db, DEFAULT_STALE_HOLD_MINUTES);
	}

	if (job === 'reminders' || job === 'all') {
		if (!drinksEnabled(db)) {
			result.reminders = 'skipped: drinks are off';
			return json(result);
		}

		const rows = db
			.prepare(
				`SELECT id, time_slot, drink_count, total_cents, customer_name, customer_email,
				        items, pickup_location
				   FROM reservations
				  WHERE reservation_date = ? AND status = 'confirmed'
				    AND reminder_sent_at IS NULL
				  ORDER BY time_slot, id`
			)
			.all(today) as Record<string, unknown>[];

		// The run sheet is built from ALL of today's confirmed reservations, not
		// just the un-reminded ones, so a re-run still mails an accurate sheet.
		const allToday = db
			.prepare(
				`SELECT time_slot, drink_count, items FROM reservations
				  WHERE reservation_date = ? AND status = 'confirmed'`
			)
			.all(today) as Record<string, unknown>[];

		function drinksOf(items: unknown): { name: string; quantity: number }[] {
			try {
				const parsed = JSON.parse(String(items ?? '[]'));
				if (!Array.isArray(parsed)) return [];
				return parsed.map((l: Record<string, unknown>) => {
					const q = Number(l?.quantity);
					return {
						name: String(l?.name ?? 'Drink'),
						quantity: Number.isFinite(q) ? q : 0
					};
				});
			} catch {
				return [];
			}
		}

		// --- customer pickup reminders ---
		let remindersSent = 0;
		const markSent = db.prepare(
			"UPDATE reservations SET reminder_sent_at = datetime('now') WHERE id = ?"
		);
		for (const row of rows) {
			const to = String(row.customer_email ?? '');
			if (!to) {
				// Nothing to send to. Mark it so it stops being re-queried every run
				// and stops holding remindersPending permanently above zero — that
				// number is the only signal of a real mail outage.
				console.error(`Reservation ${row.id} has no customer email; skipping reminder.`);
				markSent.run(row.id);
				continue;
			}
			try {
				await sendPickupReminder(to, String(row.customer_name ?? ''), {
					date: today,
					timeSlot: String(row.time_slot ?? ''),
					drinks: drinksOf(row.items),
					totalCents: Number(row.total_cents ?? 0),
					pickupLocation: (row.pickup_location as string | null) ?? null
				});
				// Marked only after a successful send, so a mail outage retries on
				// the next run instead of silently skipping the customer.
				markSent.run(row.id);
				remindersSent++;
			} catch (e) {
				console.error(`Pickup reminder failed for reservation ${row.id}:`, e);
			}
		}
		result.remindersSent = remindersSent;
		result.remindersPending = rows.length - remindersSent;

		// --- owner run sheet ---
		const bySlot = new Map<
			string,
			{ label: string; confirmed_drinks: number; tally: Record<string, number> }
		>();
		for (const row of allToday) {
			const label = String(row.time_slot);
			if (!bySlot.has(label)) bySlot.set(label, { label, confirmed_drinks: 0, tally: {} });
			const slot = bySlot.get(label)!;
			slot.confirmed_drinks += Number(row.drink_count ?? 0);
			for (const d of drinksOf(row.items)) {
				slot.tally[d.name] = (slot.tally[d.name] ?? 0) + d.quantity;
			}
		}
		const slots = [...bySlot.values()].sort((a, b) => a.label.localeCompare(b.label));

		// At most one run sheet per day. Without this, `job` defaulting to 'all'
		// means any frequent tick — or an n8n retry after a timeout — mails
		// Deborah a fresh sheet every time.
		result.ownerSheetSent = false;
		const alreadySent = getSettingOn(db, RUN_SHEET_SENT_KEY) === today;
		if (alreadySent) {
			result.ownerSheet = 'already sent today';
		} else if (slots.length > 0) {
			try {
				const ownerEmail = getSettingOn(db, SETTINGS.ownerNotificationEmail);
				if (ownerEmail) {
					await sendOwnerRunSheet(
						ownerEmail,
						today,
						slots,
						getSettingOn(db, SETTINGS.drinksPickupLocation) || null
					);
					// Recorded only after a successful send, so a mail outage retries.
					setSettingOn(db, RUN_SHEET_SENT_KEY, today);
					result.ownerSheetSent = true;
				}
			} catch (e) {
				console.error('Owner run sheet failed:', e);
			}
		}
		result.dayTotalDrinks = slots.reduce((sum, s) => sum + s.confirmed_drinks, 0);
		// Surfaced so the n8n run log shows the cap the day was measured against.
		// Must match the fallback holdCapacity actually enforces, or the run log
		// reports a cap the day was never measured against.
		result.dailyCap = getIntSettingOn(db, SETTINGS.drinksDailyCap, DRINKS_DEFAULT_DAILY_CAP);
	}

	return json(result);
}
