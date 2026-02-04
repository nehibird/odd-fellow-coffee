import { createHmac, timingSafeEqual } from 'crypto';
import { STRIPE_WEBHOOK_SECRET } from '$env/static/private';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
	return EMAIL_RE.test(email) && email.length <= 254;
}

// HMAC token for subscription self-service with 24-hour expiry
// Token format: timestamp.hmac where hmac = HMAC(email + timestamp)
const HMAC_SECRET = STRIPE_WEBHOOK_SECRET;
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createEmailToken(email: string): string {
	const timestamp = Date.now().toString(36); // base36 for compact representation
	const hmac = createHmac('sha256', HMAC_SECRET)
		.update(email.toLowerCase().trim() + timestamp)
		.digest('hex')
		.slice(0, 24);
	return `${timestamp}.${hmac}`;
}

export function verifyEmailToken(email: string, token: string): boolean {
	const parts = token.split('.');
	if (parts.length !== 2) return false;

	const [timestamp, hmac] = parts;

	// Check expiry
	const tokenTime = parseInt(timestamp, 36);
	if (isNaN(tokenTime) || Date.now() - tokenTime > TOKEN_EXPIRY_MS) {
		return false;
	}

	// Verify HMAC
	const expected = createHmac('sha256', HMAC_SECRET)
		.update(email.toLowerCase().trim() + timestamp)
		.digest('hex')
		.slice(0, 24);

	if (hmac.length !== expected.length) return false;

	try {
		return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
	} catch {
		return false;
	}
}

const VALID_ORDER_STATUSES = new Set(['pending', 'confirmed', 'fulfilled']);
const VALID_ORDER_STAGES = new Set(['ordered', 'baking', 'ready', 'picked_up', 'shipped', 'delivered']);
const VALID_DROP_STATUSES = new Set(['scheduled', 'live', 'sold_out', 'closed']);
const VALID_FREQUENCIES = new Set(['weekly', 'biweekly', 'monthly']);

export function isValidOrderStatus(s: string): boolean {
	return VALID_ORDER_STATUSES.has(s);
}

export function isValidOrderStage(s: string): boolean {
	return VALID_ORDER_STAGES.has(s);
}

export function isValidDropStatus(s: string): boolean {
	return VALID_DROP_STATUSES.has(s);
}

export function isValidFrequency(f: string): boolean {
	return VALID_FREQUENCIES.has(f);
}
