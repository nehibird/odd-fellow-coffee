import { json, error } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth';
import { DRINK_CATEGORY, getDb } from '$lib/server/db';

// Must list every category actually present in the products table, or editing a
// product of an unlisted category 400s. 'hotplate' was missing even though the
// table has hotplate rows; 'drinks' is listed so a drink's category round-trips
// rather than being rejected or rewritten. Keep in sync with
// admin/routes/products.js, which is the editor that is actually deployed.
const VALID_CATEGORIES = new Set(['coffee', 'bakery', 'hotplate', DRINK_CATEGORY]);
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

function validateProduct(body: any, requireId = false): { name: string; category: string; description: string; price_cents: number; variants: string | null; subscribable: number; active: number; image: string | null; id?: number } {
	if (requireId && (!body.id || typeof body.id !== 'number')) {
		throw error(400, 'Valid id required');
	}
	if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
		throw error(400, 'Name is required');
	}
	if (body.name.length > MAX_NAME_LENGTH) {
		throw error(400, `Name must be ${MAX_NAME_LENGTH} characters or less`);
	}
	if (!body.category || !VALID_CATEGORIES.has(body.category)) {
		throw error(400, `Category must be one of: ${[...VALID_CATEGORIES].join(', ')}`);
	}
	if (body.description && body.description.length > MAX_DESCRIPTION_LENGTH) {
		throw error(400, `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
	}
	if (typeof body.price_cents !== 'number' || body.price_cents < 0 || !Number.isInteger(body.price_cents)) {
		throw error(400, 'Price must be a non-negative integer (cents)');
	}
	if (body.price_cents > 1000000) { // $10,000 max
		throw error(400, 'Price exceeds maximum allowed');
	}
	// Validate variants JSON if provided
	if (body.variants) {
		try {
			const v = typeof body.variants === 'string' ? JSON.parse(body.variants) : body.variants;
			if (typeof v !== 'object') throw new Error();
		} catch {
			throw error(400, 'Variants must be valid JSON');
		}
	}

	return {
		name: body.name.trim(),
		category: body.category,
		description: body.description?.trim() || '',
		price_cents: body.price_cents,
		variants: body.variants || null,
		subscribable: body.subscribable ? 1 : 0,
		active: body.active !== false ? 1 : 0,
		image: body.image || null,
		...(requireId && { id: body.id })
	};
}

export function GET({ cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const db = getDb();
	const products = db.prepare('SELECT * FROM products ORDER BY category, name').all();
	return json(products);
}

/**
 * Whether a product is a made-to-order drink is not an editable field: the
 * reservation system selects on `category = 'drinks'` and the storefront excludes
 * it, so moving a product across that line in either direction silently breaks
 * one of the two systems.
 */
function assertDrinkCategoryUnchanged(
	db: ReturnType<typeof getDb>,
	id: number,
	submitted: string
) {
	const existing = db.prepare('SELECT category FROM products WHERE id = ?').get(id) as
		| { category: string }
		| undefined;
	if (!existing) throw error(404, 'Product not found');
	if ((existing.category === DRINK_CATEGORY) !== (submitted === DRINK_CATEGORY)) {
		throw error(400, 'A product cannot be moved into or out of the drinks category.');
	}
}

export async function POST({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const body = await request.json();
	const validated = validateProduct(body);
	if (validated.category === DRINK_CATEGORY) {
		throw error(
			400,
			'Drinks cannot be created here — they are seeded by the app and sold through reservations.'
		);
	}
	const db = getDb();
	const result = db.prepare(
		'INSERT INTO products (name, category, description, price_cents, variants, subscribable, image) VALUES (?, ?, ?, ?, ?, ?, ?)'
	).run(validated.name, validated.category, validated.description, validated.price_cents, validated.variants, validated.subscribable, validated.image);
	return json({ id: result.lastInsertRowid });
}

export async function PUT({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const body = await request.json();
	const validated = validateProduct(body, true);
	const db = getDb();
	assertDrinkCategoryUnchanged(db, validated.id!, validated.category);
	const stockQuantity = body.stock_quantity !== undefined ? (body.stock_quantity === null ? null : Number(body.stock_quantity)) : undefined;
	db.prepare(
		'UPDATE products SET name=?, category=?, description=?, price_cents=?, variants=?, subscribable=?, active=?, image=? WHERE id=?'
	).run(validated.name, validated.category, validated.description, validated.price_cents, validated.variants, validated.subscribable, validated.active, validated.image, validated.id);
	if (stockQuantity !== undefined) {
		db.prepare('UPDATE products SET stock_quantity = ? WHERE id = ?').run(stockQuantity, validated.id);
	}
	return json({ ok: true });
}

export async function DELETE({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const { id } = await request.json();
	if (!id || typeof id !== 'number') throw error(400, 'Valid id required');
	const db = getDb();
	db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(id);
	return json({ ok: true });
}
