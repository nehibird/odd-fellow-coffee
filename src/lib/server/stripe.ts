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
	customerEmail: string | undefined,
	successUrl: string,
	cancelUrl: string,
	opts?: { collectShipping?: boolean; localOnly?: boolean }
) {
	const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
		price_data: {
			currency: 'usd',
			product_data: { name: item.name },
			unit_amount: item.price_cents
		},
		quantity: item.quantity
	}));

	const sessionParams: Stripe.Checkout.SessionCreateParams = {
		payment_method_types: ['card'],
		line_items: lineItems,
		mode: 'payment',
		success_url: successUrl,
		cancel_url: cancelUrl
	};

	// Only pre-fill email if provided; otherwise Stripe will collect it
	if (customerEmail) {
		sessionParams.customer_email = customerEmail;
	}

	if (opts?.collectShipping) {
		sessionParams.shipping_address_collection = { allowed_countries: ['US'] };
		if (opts.localOnly) {
			sessionParams.shipping_options = [
				{
					shipping_rate_data: {
						type: 'fixed_amount',
						fixed_amount: { amount: 0, currency: 'usd' },
						display_name: 'Free Local Delivery (Tonkawa area)',
						delivery_estimate: {
							minimum: { unit: 'business_day', value: 1 },
							maximum: { unit: 'business_day', value: 2 }
						}
					}
				}
			];
		} else {
			sessionParams.shipping_options = [
				{
					shipping_rate_data: {
						type: 'fixed_amount',
						fixed_amount: { amount: 599, currency: 'usd' },
						display_name: 'Flat Rate Shipping (USPS, 3-5 business days)',
						delivery_estimate: {
							minimum: { unit: 'business_day', value: 3 },
							maximum: { unit: 'business_day', value: 5 }
						}
					}
				}
			];
		}
	}

	return stripe.checkout.sessions.create(sessionParams);
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
	cancelUrl: string,
	variant?: string
) {
	const recurring = FREQUENCY_MAP[frequency];
	if (!recurring) throw new Error(`Invalid frequency: ${frequency}`);

	const frequencyLabel = frequency === 'weekly' ? 'Weekly' : frequency === 'biweekly' ? 'Every 2 Weeks' : 'Monthly';

	return stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		line_items: [
			{
				price_data: {
					currency: 'usd',
					product_data: { name: `${productName} — ${frequencyLabel}` },
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
		shipping_address_collection: { allowed_countries: ['US'] },
		metadata: {
			product_id: String(productId),
			frequency,
			variant: variant || '',
			price_cents: String(priceCents)
		}
	});
}
