import { json, error } from '@sveltejs/kit';
import { login } from '$lib/server/auth';

export async function POST({ request, cookies }) {
	const { password } = await request.json();
	if (!password) throw error(400, 'Password required');

	const success = login(password, cookies);
	if (!success) throw error(401, 'Invalid password');

	return json({ ok: true });
}
