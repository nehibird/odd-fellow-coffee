import { json, error } from '@sveltejs/kit';
import { getDb, getSetting } from '$lib/server/db';
import { sendOwnerDailyDigest, sendDeliveryDayReminder } from '$lib/server/email';
import { env } from '$env/dynamic/private';
import { isAuthenticated } from '$lib/server/auth';

/**
 * Daily delivery digest endpoint.
 * Called by n8n cron or external scheduler.
 * Sends:
 *   1. Owner (Deborah) gets a digest of ALL deliveries due today
 *   2. Each customer with a delivery today gets a reminder email
 *
 * Auth: requires ?secret=<CRON_SECRET> query param to prevent abuse.
 * If CRON_SECRET is not set, falls back to admin cookie auth.
 */
export async function POST({ url, cookies }) {
	// Authenticate: either cron secret or admin session
	const secret = url.searchParams.get('secret');
	const cronSecret = env.CRON_SECRET;
	if (cronSecret && secret === cronSecret) {
		// Valid cron secret — proceed
	} else if (!isAuthenticated(cookies)) {
		throw error(401, 'Unauthorized');
	}

	const db = getDb();
	const today = new Date().toISOString().split('T')[0];
	const todayFormatted = new Date().toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});

	// Find all active subscriptions with next_delivery_date = today
	const dueSubs = db.prepare(
		`SELECT s.*, p.name as product_name FROM subscriptions s
		 LEFT JOIN products p ON p.id = s.product_id
		 WHERE s.status = 'active' AND s.next_delivery_date = ?`
	).all(today) as any[];

	if (dueSubs.length === 0) {
		return json({ ok: true, message: 'No deliveries today', sent: 0 });
	}

	let customerEmailsSent = 0;
	let ownerEmailSent = false;

	// 1. Send customer delivery-day reminders
	for (const sub of dueSubs) {
		try {
			let parsedAddr = null;
			if (sub.shipping_address) {
				try { parsedAddr = JSON.parse(sub.shipping_address); } catch { /* ignore */ }
			}
			await sendDeliveryDayReminder(
				sub.customer_email,
				sub.product_name || 'Coffee Subscription',
				sub.variant,
				sub.shipping_name ? 'local' : null,
				parsedAddr
			);
			customerEmailsSent++;
		} catch (e) {
			console.error(`Delivery reminder failed for ${sub.customer_email}:`, e);
		}
	}

	// 2. Send owner daily digest
	try {
		const ownerEmail = getSetting('owner_notification_email');
		if (ownerEmail) {
			const deliveries = dueSubs.map(sub => {
				let parsedAddr = null;
				if (sub.shipping_address) {
					try { parsedAddr = JSON.parse(sub.shipping_address); } catch { /* ignore */ }
				}
				return {
					customerEmail: sub.customer_email,
					shippingName: sub.shipping_name,
					productName: sub.product_name || 'Coffee Subscription',
					variant: sub.variant,
					frequency: sub.frequency,
					shippingAddress: parsedAddr
				};
			});
			await sendOwnerDailyDigest(ownerEmail, deliveries, todayFormatted);
			ownerEmailSent = true;
		}
	} catch (e) {
		console.error('Owner daily digest failed:', e);
	}

	return json({
		ok: true,
		date: today,
		deliveries: dueSubs.length,
		customerEmailsSent,
		ownerEmailSent
	});
}
