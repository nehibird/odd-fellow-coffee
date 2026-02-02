import { createHmac } from 'crypto';
import { STRIPE_WEBHOOK_SECRET } from '$env/static/private';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
	return EMAIL_RE.test(email) && email.length <= 254;
}

// HMAC token for subscription self-service: ties an email to a short-lived token
// so only someone who went through checkout (and received the token) can look up / cancel
const HMAC_SECRET = STRIPE_WEBHOOK_SECRET; // reuse an existing secret

export function createEmailToken(email: string): string {
	return createHmac('sha256', HMAC_SECRET)
		.update(email.toLowerCase().trim())
		.digest('hex')
		.slice(0, 32);
}

export function verifyEmailToken(email: string, token: string): boolean {
	const expected = createEmailToken(email);
	if (token.length !== expected.length) return false;
	let match = true;
	for (let i = 0; i < expected.length; i++) {
		if (token[i] !== expected[i]) match = false;
	}
	return match;
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
