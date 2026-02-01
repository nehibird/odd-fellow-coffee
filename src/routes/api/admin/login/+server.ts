import { json, error } from '@sveltejs/kit';
import { login, checkRateLimit } from '$lib/server/auth';

export async function POST({ request, cookies, getClientAddress }) {
	const ip = getClientAddress();
	const { allowed, retryAfterSecs } = checkRateLimit(ip);
	if (!allowed) {
		throw error(429, `Too many login attempts. Try again in ${retryAfterSecs} seconds.`);
	}

	const { username, password } = await request.json();
	if (!username || !password) throw error(400, 'Username and password required');

	const success = login(username, password, cookies, ip);
	if (!success) throw error(401, 'Invalid credentials');

	return json({ ok: true });
}
