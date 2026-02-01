import { ADMIN_USERNAME, ADMIN_PASSWORD, SITE_URL } from '$env/static/private';
import type { Cookies } from '@sveltejs/kit';
import { randomBytes, timingSafeEqual } from 'crypto';

const SESSION_NAME = 'ofc_admin_session';
const MAX_SESSIONS = 100;
const isSecure = SITE_URL?.startsWith('https');

// Sessions with expiry
const sessions = new Map<string, number>(); // token -> expires_at (ms)

// Rate limiting: IP -> { attempts, blockedUntil }
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function cleanupSessions() {
	const now = Date.now();
	for (const [token, expires] of sessions) {
		if (expires < now) sessions.delete(token);
	}
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSecs?: number } {
	const now = Date.now();
	const record = loginAttempts.get(ip);
	if (record) {
		if (record.blockedUntil > now) {
			return { allowed: false, retryAfterSecs: Math.ceil((record.blockedUntil - now) / 1000) };
		}
		// Reset if window expired
		if (record.blockedUntil < now && record.count >= MAX_ATTEMPTS) {
			loginAttempts.delete(ip);
		}
	}
	return { allowed: true };
}

function recordFailedAttempt(ip: string) {
	const now = Date.now();
	const record = loginAttempts.get(ip);
	if (record) {
		record.count += 1;
		if (record.count >= MAX_ATTEMPTS) {
			record.blockedUntil = now + BLOCK_DURATION_MS;
		}
	} else {
		loginAttempts.set(ip, { count: 1, blockedUntil: 0 });
		// Auto-cleanup after window
		setTimeout(() => loginAttempts.delete(ip), ATTEMPT_WINDOW_MS);
	}
}

function clearAttempts(ip: string) {
	loginAttempts.delete(ip);
}

function safeCompare(a: string, b: string): boolean {
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);
	if (bufA.length !== bufB.length) return false;
	return timingSafeEqual(bufA, bufB);
}

export function login(username: string, password: string, cookies: Cookies, ip: string): boolean {
	if (!username || !password) return false;
	if (!safeCompare(username, ADMIN_USERNAME) || !safeCompare(password, ADMIN_PASSWORD)) {
		recordFailedAttempt(ip);
		return false;
	}

	clearAttempts(ip);
	cleanupSessions();

	// Enforce max sessions
	if (sessions.size >= MAX_SESSIONS) {
		// Remove oldest
		const oldest = sessions.keys().next().value;
		if (oldest) sessions.delete(oldest);
	}

	const token = randomBytes(32).toString('hex');
	const maxAge = 60 * 60 * 8; // 8 hours
	sessions.set(token, Date.now() + maxAge * 1000);

	cookies.set(SESSION_NAME, token, {
		path: '/admin',
		httpOnly: true,
		sameSite: 'strict',
		secure: isSecure,
		maxAge
	});
	// Also set for /api/admin so API calls work
	cookies.set(SESSION_NAME, token, {
		path: '/api/admin',
		httpOnly: true,
		sameSite: 'strict',
		secure: isSecure,
		maxAge
	});
	return true;
}

export function isAuthenticated(cookies: Cookies): boolean {
	const token = cookies.get(SESSION_NAME);
	if (!token) return false;
	const expires = sessions.get(token);
	if (!expires) return false;
	if (expires < Date.now()) {
		sessions.delete(token);
		return false;
	}
	return true;
}

export function logout(cookies: Cookies) {
	const token = cookies.get(SESSION_NAME);
	if (token) sessions.delete(token);
	cookies.delete(SESSION_NAME, { path: '/admin' });
	cookies.delete(SESSION_NAME, { path: '/api/admin' });
}
