import { getDb } from '$lib/server/db';
import { drinksEnabled } from '$lib/server/reservations';

/**
 * Exposed so the header can show the Drinks link only when drink ordering is
 * actually open. The whole feature ships behind `drinks_enabled`, and a nav link
 * to a page that turns people away is worse than no link.
 */
export function load() {
	return { drinksEnabled: drinksEnabled(getDb()) };
}
