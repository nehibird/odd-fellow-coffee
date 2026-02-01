import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';

export function GET({ url }) {
	const db = getDb();
	const category = url.searchParams.get('category');
	if (category) {
		const products = db.prepare('SELECT * FROM products WHERE active = 1 AND category = ?').all(category);
		return json(products);
	}
	const products = db.prepare('SELECT * FROM products WHERE active = 1').all();
	return json(products);
}
