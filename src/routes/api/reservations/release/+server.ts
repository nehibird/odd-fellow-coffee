import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { releaseCapacity } from '$lib/server/reservations';

/**
 * Give back a hold the customer has walked away from.
 *
 * Capacity is taken before payment, so a customer who opens checkout, goes
 * back, and changes their order would otherwise leave their own drinks parked
 * for the full 30-minute session expiry — and with a daily cap in the low teens
 * they can lock themselves out of the day entirely.
 *
 * The Stripe session id is the credential: it is long, random, and only ever
 * returned to the client that created the hold, so possessing one is equivalent
 * to being that customer. `releaseCapacity` only ever touches a `pending` row,
 * so this can never cancel something already paid for — and if a payment does
 * land afterwards, the webhook's `revived` path honours it and warns the owner.
 */
export async function POST({ request }) {
	const { sessionId } = await request.json().catch(() => ({ sessionId: null }));
	if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
		throw error(400, 'A checkout session id is required.');
	}

	const released = releaseCapacity(getDb(), sessionId);
	return json({ released });
}
