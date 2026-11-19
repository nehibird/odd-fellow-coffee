import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { applySchema, DRINK_CATEGORY } from './db';
import {
	listShopProducts,
	listProductsInCategory,
	getShopProduct,
	getSubscribableProduct
} from './products';

let dir: string;
let db: Database.Database;

function addProduct(d: Database.Database, name: string, category: string, active: number): number {
	const r = d
		.prepare('INSERT INTO products (name, category, price_cents, active) VALUES (?, ?, ?, ?)')
		.run(name, category, 500, active);
	return Number(r.lastInsertRowid);
}

let beanId: number;
let bakeryId: number;
let icedLatteId: number;
let retiredBeanId: number;
let retiredDrinkId: number;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'ofc-products-'));
	db = new Database(join(dir, 'test.db'));
	db.pragma('journal_mode = WAL');
	applySchema(db);
	db.prepare('DELETE FROM products').run();

	beanId = addProduct(db, 'Ethiopia Natural', 'coffee', 1);
	bakeryId = addProduct(db, 'Cinnamon Roll', 'bakery', 1);
	// The case this whole module exists for: an ACTIVE drink. Go-live flips these
	// on, and every unfiltered `active = 1` query then sells it as a shippable bag.
	icedLatteId = addProduct(db, 'Iced Latte', DRINK_CATEGORY, 1);
	retiredBeanId = addProduct(db, 'Last Season Blend', 'coffee', 0);
	retiredDrinkId = addProduct(db, 'Iced Coffee', DRINK_CATEGORY, 0);
});

afterEach(() => {
	db.close();
	rmSync(dir, { recursive: true, force: true });
});

describe('listShopProducts', () => {
	it('returns active non-drink products', () => {
		const names = listShopProducts(db)
			.map((p) => p.name)
			.sort();
		expect(names).toEqual(['Cinnamon Roll', 'Ethiopia Natural']);
	});

	it('omits an ACTIVE drink but keeps the other categories', () => {
		const ids = listShopProducts(db).map((p) => p.id);
		expect(ids).not.toContain(icedLatteId);
		expect(ids).toContain(beanId);
		expect(ids).toContain(bakeryId);
	});

	it('omits inactive products', () => {
		const ids = listShopProducts(db).map((p) => p.id);
		expect(ids).not.toContain(retiredBeanId);
		expect(ids).not.toContain(retiredDrinkId);
	});
});

describe('listProductsInCategory', () => {
	it('returns only the active products in that category', () => {
		const names = listProductsInCategory(db, 'coffee').map((p) => p.name);
		expect(names).toEqual(['Ethiopia Natural']);
	});

	it('returns nothing for a category with no active products', () => {
		expect(listProductsInCategory(db, 'hotplate')).toEqual([]);
	});

	it('still serves drinks when drinks are asked for by name', () => {
		// An explicit ?category=drinks is a deliberate request, not a leak. The
		// reservation UI is allowed to read its own catalogue.
		const names = listProductsInCategory(db, DRINK_CATEGORY).map((p) => p.name);
		expect(names).toEqual(['Iced Latte']);
	});
});

describe('getShopProduct', () => {
	it('finds an active non-drink product', () => {
		expect(getShopProduct(db, beanId)?.name).toBe('Ethiopia Natural');
	});

	it('refuses an ACTIVE drink', () => {
		// The money bug. Without this, a crafted checkout POST carrying a drink's
		// productId and no reservationData buys an Iced Latte as a shippable item:
		// shipping is collected, no slot is held and no reservation row exists, so
		// nobody is ever told to make it.
		expect(getShopProduct(db, icedLatteId)).toBeUndefined();
	});

	it('refuses an inactive product', () => {
		expect(getShopProduct(db, retiredBeanId)).toBeUndefined();
	});

	it('refuses an unknown id', () => {
		expect(getShopProduct(db, 999999)).toBeUndefined();
	});
});

describe('getSubscribableProduct', () => {
	beforeEach(() => {
		db.prepare('UPDATE products SET subscribable = 1').run();
	});

	it('finds an active subscribable non-drink product', () => {
		expect(getSubscribableProduct(db, beanId)?.name).toBe('Ethiopia Natural');
	});

	it('refuses a drink even when it is marked subscribable', () => {
		// Today both drink rows carry subscribable = 0, so the old query was safe
		// by accident. One checkbox in the admin product editor would undo that.
		expect(getSubscribableProduct(db, icedLatteId)).toBeUndefined();
	});

	it('refuses a product that is not marked subscribable', () => {
		db.prepare('UPDATE products SET subscribable = 0 WHERE id = ?').run(beanId);
		expect(getSubscribableProduct(db, beanId)).toBeUndefined();
	});

	it('refuses an inactive product', () => {
		expect(getSubscribableProduct(db, retiredBeanId)).toBeUndefined();
	});
});

describe('non-integer ids (review finding 4)', () => {
	// productId comes straight off a JSON body. An object or an array in a bind
	// position is read by better-sqlite3 as a named-parameter container, so it
	// throws "Too few parameter values were provided" — which escapes as a 500
	// with a stack trace rather than the intended 400. (A string or a float binds
	// harmlessly and matches no row; they are covered here to pin that down.)
	const hostile = [{}, [], 'abc', 1.5, NaN, Infinity, null, undefined];

	for (const bad of hostile) {
		it(`getShopProduct returns undefined for ${JSON.stringify(bad) ?? String(bad)}`, () => {
			expect(() => getShopProduct(db, bad as unknown as number)).not.toThrow();
			expect(getShopProduct(db, bad as unknown as number)).toBeUndefined();
		});

		it(`getSubscribableProduct returns undefined for ${JSON.stringify(bad) ?? String(bad)}`, () => {
			expect(() => getSubscribableProduct(db, bad as unknown as number)).not.toThrow();
			expect(getSubscribableProduct(db, bad as unknown as number)).toBeUndefined();
		});
	}
});
