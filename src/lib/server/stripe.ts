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
