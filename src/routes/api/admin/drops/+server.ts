import { json, error } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { isValidDropStatus } from '$lib/server/validation';

export function GET({ cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const db = getDb();
	const drops = db.prepare('SELECT * FROM drops ORDER BY drop_date DESC').all() as any[];
	for (const drop of drops) {
		drop.items = db
			.prepare(
				`SELECT di.*, p.name FROM drop_items di
				 JOIN products p ON p.id = di.product_id
				 WHERE di.drop_id = ?`
			)
			.all(drop.id);
	}
	return json(drops);
}

export async function POST({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const { title, drop_date, opens_at, closes_at, pickup_start, pickup_end, items } =
		await request.json();
	if (!title || !drop_date || !opens_at || !items?.length) {
		throw error(400, 'title, drop_date, opens_at, and items required');
	}
	const db = getDb();
	const insert = db.transaction(() => {
		const result = db
			.prepare(
				'INSERT INTO drops (title, drop_date, opens_at, closes_at, pickup_start, pickup_end) VALUES (?,?,?,?,?,?)'
			)
			.run(title, drop_date, opens_at, closes_at || null, pickup_start || null, pickup_end || null);
		const dropId = result.lastInsertRowid;
		const stmt = db.prepare(
			'INSERT INTO drop_items (drop_id, product_id, quantity_available, price_cents_override) VALUES (?,?,?,?)'
		);
		for (const item of items) {
			stmt.run(dropId, item.product_id, item.quantity_available, item.price_cents_override || null);
		}
		return dropId;
	});
	const dropId = insert();
	return json({ id: dropId });
}

export async function PUT({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const { id, ...fields } = await request.json();
	if (!id) throw error(400, 'id required');
	const db = getDb();
	const allowed = ['title', 'drop_date', 'opens_at', 'closes_at', 'pickup_start', 'pickup_end', 'status'];
	const sets: string[] = [];
	const vals: any[] = [];
	for (const key of allowed) {
		if (key in fields) {
			if (key === 'status' && !isValidDropStatus(fields[key])) {
				throw error(400, 'Invalid status value');
			}
			sets.push(`${key} = ?`);
			vals.push(fields[key]);
		}
	}
	if (sets.length) {
		vals.push(id);
		db.prepare(`UPDATE drops SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
	}
	return json({ ok: true });
}

export async function DELETE({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const { id } = await request.json();
	if (!id) throw error(400, 'id required');
	const db = getDb();
	db.prepare("UPDATE drops SET status = 'closed' WHERE id = ?").run(id);
	return json({ ok: true });
}
