import { getDb } from '$lib/server/db';
import { listShopProducts } from '$lib/server/products';

export function load() {
	const db = getDb();
	// Drinks are reservation-only — see listShopProducts.
	const products = listShopProducts(db);
	return { products };
}
