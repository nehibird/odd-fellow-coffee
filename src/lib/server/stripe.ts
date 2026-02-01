import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '$env/static/private';

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2024-12-18.acacia'
});

interface LineItem {
	name: string;
	price_cents: number;
	quantity: number;
}

export async function createCheckoutSession(
	items: LineItem[],
	customerEmail: string,
	successUrl: string,
	cancelUrl: string
) {
	const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
		price_data: {
			currency: 'usd',
			product_data: { name: item.name },
			unit_amount: item.price_cents
		},
		quantity: item.quantity
	}));

	return stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		line_items: lineItems,
		mode: 'payment',
		customer_email: customerEmail,
		success_url: successUrl,
		cancel_url: cancelUrl
	});
}

const FREQUENCY_MAP: Record<string, { interval: 'week' | 'month'; interval_count: number }> = {
	weekly: { interval: 'week', interval_count: 1 },
	biweekly: { interval: 'week', interval_count: 2 },
	monthly: { interval: 'month', interval_count: 1 }
};

export async function createSubscriptionCheckout(
	productName: string,
	priceCents: number,
	frequency: string,
	customerEmail: string,
	productId: number,
	successUrl: string,
	cancelUrl: string
) {
	const recurring = FREQUENCY_MAP[frequency];
	if (!recurring) throw new Error(`Invalid frequency: ${frequency}`);

	return stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		line_items: [
			{
				price_data: {
					currency: 'usd',
					product_data: { name: `${productName} (${frequency})` },
					unit_amount: priceCents,
					recurring
				},
				quantity: 1
			}
		],
		mode: 'subscription',
		customer_email: customerEmail,
		success_url: successUrl,
		cancel_url: cancelUrl,
		metadata: {
			product_id: String(productId),
			frequency
		}
	});
}
