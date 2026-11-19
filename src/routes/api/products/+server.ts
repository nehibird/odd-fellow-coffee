import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { listProductsInCategory, listShopProducts } from '$lib/server/products';

export function GET({ url }) {
	const db = getDb();
	const category = url.searchParams.get('category');
	if (category) {
		return json(listProductsInCategory(db, category));
	}
	// The unfiltered listing is the shop catalogue, so it excludes drinks — see
	// listShopProducts. Callers that want drinks ask for them by category.
	return json(listShopProducts(db));
}
