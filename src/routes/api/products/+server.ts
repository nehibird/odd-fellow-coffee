import { json } from '@sveltejs/kit';
import { DRINK_CATEGORY, getDb } from '$lib/server/db';
import { listProductsInCategory, listShopProducts } from '$lib/server/products';
import { drinksEnabled } from '$lib/server/reservations';

export function GET({ url }) {
	const db = getDb();
	const category = url.searchParams.get('category');
	if (category) {
		// The drinks catalogue follows the same switch the reservation page does.
		// Go-live activates the drink rows BEFORE `drinks_enabled` is flipped, and
		// in that window this endpoint would publish drink names, descriptions and
		// prices while ordering still answers 403.
		if (category === DRINK_CATEGORY && !drinksEnabled(db)) {
			return json([]);
		}
		return json(listProductsInCategory(db, category));
	}
	// The unfiltered listing is the shop catalogue, so it excludes drinks — see
	// listShopProducts. Callers that want drinks ask for them by category.
	return json(listShopProducts(db));
}
