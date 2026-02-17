import { json, error } from '@sveltejs/kit';
import { getAllSettings, setSetting } from '$lib/server/db';
import { isAuthenticated } from '$lib/server/auth';

export async function GET({ cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	return json(getAllSettings());
}

export async function PUT({ request, cookies }) {
	if (!isAuthenticated(cookies)) throw error(401, 'Unauthorized');
	const settings = await request.json();
	if (!settings || typeof settings !== 'object') throw error(400, 'Settings object required');

	const allowedKeys = [
		'owner_notification_email',
		'pickup_address',
		'pickup_times',
		'delivery_times',
		'bread_lead_days',
		'bread_delivery_days'
	];

	for (const [key, value] of Object.entries(settings)) {
		if (!allowedKeys.includes(key)) continue;
		if (typeof value !== 'string') continue;
		setSetting(key, value);
	}

	return json({ ok: true });
}
