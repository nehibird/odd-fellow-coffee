import { getDb } from '$lib/server/db';

export function load() {
	const db = getDb();
	const products = db.prepare('SELECT * FROM products WHERE active = 1').all();
	return { products };
}
