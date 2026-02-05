import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { createSubscriptionCheckout } from '$lib/server/stripe';
import { SITE_URL } from '$env/static/private';
import { isValidEmail, isValidFrequency } from '$lib/server/validation';

export async function POST({ request }) {
	const { productId, frequency, email, variant, price_cents } = await request.json();
	if (!productId || !frequency || !email) {
		throw error(400, 'productId, frequency, and email required');
	}
	if (!isValidEmail(email)) throw error(400, 'Invalid email format');
	if (!isValidFrequency(frequency)) throw error(400, 'Invalid frequency');

	const db = getDb();
	const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1 AND subscribable = 1').get(productId) as any;
	if (!product) throw error(400, 'Product not found or not subscribable');

	// Subscription discount rate (10% off)
	const SUB_DISCOUNT = 0.10;

	// Validate variant price if provided
	let basePrice = product.price_cents;
	if (price_cents && product.variants) {
		try {
			const variants = JSON.parse(product.variants);
			if (variants.sizes && Array.isArray(variants.sizes)) {
				const validPrices = variants.sizes
					.filter((s: any) => typeof s === 'object' && s.price_cents)
					.map((s: any) => s.price_cents);
				if (validPrices.includes(price_cents)) {
					basePrice = price_cents;
				}
			}
		} catch { /* use default price */ }
	}

	// Apply subscription discount
	const finalPrice = Math.round(basePrice * (1 - SUB_DISCOUNT));

	// Build product name with variant and discount
	const productName = variant ? `${product.name} (${variant})` : product.name;

	const session = await createSubscriptionCheckout(
		productName,
		finalPrice,
		frequency,
		email,
		product.id,
		`${SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
		`${SITE_URL}/checkout/cancel`,
		variant
	);

	return json({ url: session.url });
}
