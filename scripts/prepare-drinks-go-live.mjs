/**
 * Prepare drink ordering for go-live.
 *
 * Idempotent and ADDITIVE. Run it as many times as you like.
 *
 * It deliberately does NOT:
 *   - turn drink ordering on (`drinks_enabled`) — that is the switch, and it is
 *     yours to throw once you are satisfied with everything below
 *   - touch Stripe keys or the webhook — those live in .env and the Stripe
 *     dashboard
 *   - deactivate the old 07:00-11:00 pickup slots — it reports them instead,
 *     because they belong to the bakery pickup flow rather than to drinks
 *
 * Usage, on the VPS:
 *   cd /opt/odd-fellow-coffee
 *   docker compose exec web node scripts/prepare-drinks-go-live.mjs
 *
 * Or locally against a copy, with Node 20:
 *   DB_PATH=/path/to/copy.db /opt/homebrew/opt/node@20/bin/node scripts/prepare-drinks-go-live.mjs
 */
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || 'data/odd-fellow.db';
const DRY_RUN = process.argv.includes('--dry-run');

/** The approved configuration. All of it is changeable later from admin Settings. */
const CONFIG = {
	pickupWindow: { start: '14:45', end: '15:15' },
	// 1 = Monday .. 5 = Friday
	weekdays: [1, 2, 3, 4, 5],
	capacityPerSlot: 12,
	dailyCap: '12',
	cutoffHour: '20',
	orderDays: 'monday,tuesday,wednesday,thursday,friday',
	prices: { 'Iced Coffee': 500, 'Iced Latte': 600 }
};

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

const log = [];
function step(msg) {
	log.push(msg);
	console.log(msg);
}

if (DRY_RUN) console.log('--- DRY RUN: nothing will be written ---\n');

const run = db.transaction(() => {
	// 1. Drink pickup windows ------------------------------------------------
	const existing = db
		.prepare(
			`SELECT id, day_of_week, active, capacity_drinks FROM time_slots
			  WHERE slot_type = 'drinks' AND start_time = ? AND end_time = ?`
		)
		.all(CONFIG.pickupWindow.start, CONFIG.pickupWindow.end);
	const byDay = new Map(existing.map((s) => [s.day_of_week, s]));

	for (const dow of CONFIG.weekdays) {
		const found = byDay.get(dow);
		if (!found) {
			if (!DRY_RUN) {
				db.prepare(
					`INSERT INTO time_slots (day_of_week, start_time, end_time, capacity, active, slot_type, capacity_drinks)
					 VALUES (?, ?, ?, 0, 1, 'drinks', ?)`
				).run(dow, CONFIG.pickupWindow.start, CONFIG.pickupWindow.end, CONFIG.capacityPerSlot);
			}
			step(
				`  + created drinks window day ${dow} ${CONFIG.pickupWindow.start}-${CONFIG.pickupWindow.end} cap ${CONFIG.capacityPerSlot}`
			);
		} else if (!found.active || found.capacity_drinks !== CONFIG.capacityPerSlot) {
			if (!DRY_RUN) {
				db.prepare('UPDATE time_slots SET active = 1, capacity_drinks = ? WHERE id = ?').run(
					CONFIG.capacityPerSlot,
					found.id
				);
			}
			step(`  ~ updated drinks window day ${dow} -> active, cap ${CONFIG.capacityPerSlot}`);
		} else {
			step(`  = drinks window day ${dow} already correct`);
		}
	}

	// 2. Settings -------------------------------------------------------------
	const settings = {
		drinks_daily_cap: CONFIG.dailyCap,
		drinks_cutoff_hour: CONFIG.cutoffHour,
		drinks_order_days: CONFIG.orderDays
	};
	for (const [k, v] of Object.entries(settings)) {
		const current = db.prepare('SELECT value FROM site_settings WHERE key = ?').get(k);
		if (!current || current.value !== v) {
			if (!DRY_RUN) {
				db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run(k, v);
			}
			step(`  ~ ${k} = ${v}${current ? ` (was ${current.value})` : ''}`);
		} else {
			step(`  = ${k} already ${v}`);
		}
	}

	// 3. Drink products -------------------------------------------------------
	for (const [name, cents] of Object.entries(CONFIG.prices)) {
		const p = db
			.prepare(
				"SELECT id, price_cents, active FROM products WHERE name = ? AND category = 'drinks'"
			)
			.get(name);
		if (!p) {
			step(`  ! MISSING product "${name}" — the schema seed should have created it`);
			continue;
		}
		if (p.price_cents !== cents || !p.active) {
			if (!DRY_RUN) {
				db.prepare('UPDATE products SET price_cents = ?, active = 1 WHERE id = ?').run(cents, p.id);
			}
			step(`  ~ ${name} -> $${(cents / 100).toFixed(2)}, active`);
		} else {
			step(`  = ${name} already $${(cents / 100).toFixed(2)} and active`);
		}
	}
});

run();

// ---- Things this script will NOT do, reported so they are not forgotten ----
console.log('\n--- still needs a human ---');

const loc = db
	.prepare("SELECT value FROM site_settings WHERE key = 'drinks_pickup_location'")
	.get();
if (!loc || !loc.value.trim()) {
	console.log(
		'  [ ] drinks_pickup_location is EMPTY. Set it in admin Settings before going live —'
	);
	console.log('      it is printed in every customer confirmation email.');
} else {
	console.log(`  [x] drinks_pickup_location = "${loc.value}"`);
}

const enabled = db.prepare("SELECT value FROM site_settings WHERE key = 'drinks_enabled'").get();
console.log(
	`  [${enabled?.value === '1' ? 'x' : ' '}] drinks_enabled = ${enabled?.value ?? 'unset'}  <-- the switch, yours to throw`
);

const stale = db
	.prepare(
		`SELECT COUNT(*) AS c FROM time_slots
		  WHERE slot_type = 'pickup' AND active = 1 AND start_time < '12:00'`
	)
	.get();
if (stale.c > 0) {
	console.log(`  [ ] ${stale.c} morning pickup slots (07:00-11:00) are still active.`);
	console.log('      They belong to the bakery pickup flow, not to drinks, so this script leaves');
	console.log('      them alone. Deactivate them from admin > Time Slots if you want them gone.');
}

console.log('\n--- state ---');
const slots = db
	.prepare(
		`SELECT day_of_week, start_time, end_time, capacity_drinks, active FROM time_slots
		  WHERE slot_type = 'drinks' ORDER BY day_of_week`
	)
	.all();
for (const s of slots) {
	console.log(
		`  day ${s.day_of_week}  ${s.start_time}-${s.end_time}  cap ${s.capacity_drinks}  ${s.active ? 'active' : 'INACTIVE'}`
	);
}
const drinks = db
	.prepare("SELECT name, price_cents, active FROM products WHERE category = 'drinks'")
	.all();
for (const d of drinks) {
	console.log(
		`  ${d.name}  $${(d.price_cents / 100).toFixed(2)}  ${d.active ? 'active' : 'INACTIVE'}`
	);
}

db.close();
console.log(DRY_RUN ? '\n--- DRY RUN: nothing was written ---' : '\ndone.');
