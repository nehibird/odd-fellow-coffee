import type { Handle } from '@sveltejs/kit';

// Rate limiting for public endpoints
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMITS: Record<string, number> = {
	'/api/checkout': 10,
	'/api/subscribe': 5
};

function checkRateLimit(ip: string, path: string): { allowed: boolean; retryAfter?: number } {
	const limit = RATE_LIMITS[path];
	if (!limit) return { allowed: true };

	const key = `${ip}:${path}`;
	const now = Date.now();
	const record = rateLimits.get(key);

	if (!record || record.resetAt < now) {
		rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return { allowed: true };
	}

	if (record.count >= limit) {
		return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
	}

	record.count++;
	return { allowed: true };
}

// Cleanup old rate limit entries periodically
setInterval(() => {
	const now = Date.now();
	for (const [key, record] of rateLimits) {
		if (record.resetAt < now) rateLimits.delete(key);
	}
}, 60 * 1000);

export const handle: Handle = async ({ event, resolve }) => {
	// Rate limiting for specific endpoints
	const path = event.url.pathname;
	if (path in RATE_LIMITS && event.request.method === 'POST') {
		const ip = event.getClientAddress();
		const { allowed, retryAfter } = checkRateLimit(ip, path);
		if (!allowed) {
			return new Response(JSON.stringify({ message: `Too many requests. Try again in ${retryAfter} seconds.` }), {
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					'Retry-After': String(retryAfter)
				}
			});
		}
	}

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
	// HSTS - enforce HTTPS for 1 year, include subdomains
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	response.headers.set(
		'Content-Security-Policy',
		"default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://checkout.stripe.com https://cloudflareinsights.com; frame-src https://checkout.stripe.com"
	);

	return response;
};
