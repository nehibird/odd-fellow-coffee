import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { createSubscriptionCheckout } from '$lib/server/stripe';
import { SITE_URL } from '$env/static/private';
import { isValidEmail, isValidFrequency } from '$lib/server/validation';

export async function POST({ request }) {
	const { productId, frequency, email, name } = await request.json();
	if (!productId || !frequency || !email) {
		throw error(400, 'productId, frequency, and email required');
	}
	if (!isValidEmail(email)) throw error(400, 'Invalid email format');
	if (!isValidFrequency(frequency)) throw error(400, 'Invalid frequency');

	const db = getDb();
	const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1 AND subscribable = 1').get(productId) as any;
	if (!product) throw error(400, 'Product not found or not subscribable');

	const session = await createSubscriptionCheckout(
		product.name,
		product.price_cents,
		frequency,
		email,
		product.id,
		`${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
		`${SITE_URL}/checkout/cancel`
	);

	return json({ url: session.url });
}
