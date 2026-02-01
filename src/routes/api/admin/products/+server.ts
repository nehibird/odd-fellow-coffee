import { json, error } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

export function GET({ cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const db = getDb();
	const products = db.prepare('SELECT * FROM products ORDER BY category, name').all();
	return json(products);
}

export async function POST({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const body = await request.json();
	const db = getDb();
	const result = db.prepare(
		'INSERT INTO products (name, category, description, price_cents, variants, subscribable, image) VALUES (?, ?, ?, ?, ?, ?, ?)'
	).run(body.name, body.category, body.description, body.price_cents, body.variants || null, body.subscribable ? 1 : 0, body.image || null);
	return json({ id: result.lastInsertRowid });
}

export async function PUT({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const body = await request.json();
	if (!body.id) throw error(400, 'id required');
	const db = getDb();
	db.prepare(
		'UPDATE products SET name=?, category=?, description=?, price_cents=?, variants=?, subscribable=?, active=?, image=? WHERE id=?'
	).run(body.name, body.category, body.description, body.price_cents, body.variants || null, body.subscribable ? 1 : 0, body.active ? 1 : 0, body.image || null, body.id);
	return json({ ok: true });
}

export async function DELETE({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const { id } = await request.json();
	if (!id) throw error(400, 'id required');
	const db = getDb();
	db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(id);
	return json({ ok: true });
}
