import type Database from 'better-sqlite3';
import { DRINK_CATEGORY } from './db';

/** A row of the `products` table. */
export interface ProductRow {
	id: number;
	name: string;
	category: string;
	description: string | null;
	price_cents: number;
	variants: string | null;
	subscribable: number;
	active: number;
	image: string | null;
	created_at: string;
	stock_quantity: number | null;
}

/**
 * Made-to-order drinks live in the same `products` table as the beans and the
 * bakery, but they are sold only through the reservation flow: paid up front,
 * collected in a pickup window, capacity measured in drinks against a slot.
 *
 * That makes `active = 1` the wrong test for "can a customer buy this in the
 * shop". Drink rows ship disabled and the go-live script turns them on, so any
 * query that filters on `active` alone starts selling an Iced Latte as a
 * shippable bag of coffee the moment drinks are switched on — with a shipping
 * rate attached, no slot held and no reservation row, so nobody is ever told to
 * make it.
 *
 * The guard lives here rather than in each route because the routes that got it
 * wrong were the shop loader, the products API and the checkout product lookup
 * independently.
 */
export function listShopProducts(db: Database.Database): ProductRow[] {
	return db
		.prepare('SELECT * FROM products WHERE active = 1 AND category != ? ORDER BY id')
		.all(DRINK_CATEGORY) as ProductRow[];
}

/**
 * Active products in one category. Asking for the drinks category by name is a
 * deliberate request rather than a leak, so this does not exclude it — the
 * reservation UI reads its own catalogue through here.
 */
export function listProductsInCategory(db: Database.Database, category: string): ProductRow[] {
	return db
		.prepare('SELECT * FROM products WHERE active = 1 AND category = ? ORDER BY id')
		.all(category) as ProductRow[];
}

/**
 * One product a customer is allowed to put in the shop cart. Returns undefined
 * for an unknown id, an inactive product, or a drink — see `listShopProducts`
 * for why a drink must never resolve on the physical-goods checkout path.
 */
export function getShopProduct(db: Database.Database, id: number): ProductRow | undefined {
	return db
		.prepare('SELECT * FROM products WHERE id = ? AND active = 1 AND category != ?')
		.get(id, DRINK_CATEGORY) as ProductRow | undefined;
}

/**
 * One product a customer is allowed to start a recurring subscription for.
 * Drinks are excluded here too: they are made to order for a single pickup
 * window, so a recurring one has no meaning and no slot. Today both drink rows
 * carry `subscribable = 0`, which makes the subscribe route safe by accident —
 * one checkbox in the admin product editor would undo that.
 */
export function getSubscribableProduct(db: Database.Database, id: number): ProductRow | undefined {
	return db
		.prepare(
			'SELECT * FROM products WHERE id = ? AND active = 1 AND subscribable = 1 AND category != ?'
		)
		.get(id, DRINK_CATEGORY) as ProductRow | undefined;
}
