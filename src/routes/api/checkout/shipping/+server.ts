import { json, error } from '@sveltejs/kit';
import { stripe, getShippingOptions } from '$lib/server/stripe';

/**
 * Called by the Stripe Embedded Checkout onShippingDetailsChange callback.
 * Receives the session ID + shipping details, determines shipping rate by zip,
 * and updates the checkout session with the correct shipping option.
 */
export async function POST({ request }) {
	const { checkout_session_id, shipping_details } = await request.json();

	if (!checkout_session_id || !shipping_details) {
		throw error(400, 'checkout_session_id and shipping_details required');
	}

	const zip = shipping_details.address?.postal_code;
	if (!zip) {
		return json({
			type: 'reject',
			message: 'Please enter a valid zip code'
		});
	}

	const shippingOptions = getShippingOptions(zip);

	try {
		await stripe.checkout.sessions.update(checkout_session_id, {
			collected_information: { shipping_details },
			shipping_options: shippingOptions
		} as any);

		return json({ type: 'accept' });
	} catch (err: any) {
		console.error('Shipping update failed:', err.message);
		return json({
			type: 'reject',
			message: 'Unable to calculate shipping for this address'
		});
	}
}
