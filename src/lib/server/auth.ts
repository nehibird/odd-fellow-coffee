import { ADMIN_PASSWORD } from '$env/static/private';
import type { Cookies } from '@sveltejs/kit';
import { randomBytes } from 'crypto';

const SESSION_NAME = 'ofc_admin_session';
const sessions = new Set<string>();

export function login(password: string, cookies: Cookies): boolean {
	if (password !== ADMIN_PASSWORD) return false;
	const token = randomBytes(32).toString('hex');
	sessions.add(token);
	cookies.set(SESSION_NAME, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		maxAge: 60 * 60 * 8 // 8 hours
	});
	return true;
}

export function isAuthenticated(cookies: Cookies): boolean {
	const token = cookies.get(SESSION_NAME);
	return !!token && sessions.has(token);
}

export function logout(cookies: Cookies) {
	const token = cookies.get(SESSION_NAME);
	if (token) sessions.delete(token);
	cookies.delete(SESSION_NAME, { path: '/' });
}
