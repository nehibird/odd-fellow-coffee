import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// CSRF protection: reject non-GET/HEAD/OPTIONS requests from different origins
	if (event.request.method !== 'GET' && event.request.method !== 'HEAD' && event.request.method !== 'OPTIONS') {
		const origin = event.request.headers.get('origin');
		const host = event.request.headers.get('host');
		// Allow requests with no origin (same-origin, curl, webhooks) or matching origin
		if (origin) {
			const originHost = new URL(origin).host;
			if (originHost !== host) {
				// Exception: Stripe webhooks have signature verification
				if (!event.url.pathname.startsWith('/api/webhook/')) {
					return new Response('Forbidden: cross-origin request', { status: 403 });
				}
			}
		}
	}

	const response = await resolve(event);

	// Security headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set(
		'Content-Security-Policy',
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://checkout.stripe.com; frame-src https://checkout.stripe.com"
	);

	return response;
};
