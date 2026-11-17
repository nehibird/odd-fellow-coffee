import nodemailer from 'nodemailer';
import {
	SMTP_HOST,
	SMTP_PORT,
	SMTP_USER,
	SMTP_PASS,
	FROM_EMAIL,
	SITE_URL
} from '$env/static/private';

const transporter = nodemailer.createTransport({
	host: SMTP_HOST,
	port: Number(SMTP_PORT),
	auth: { user: SMTP_USER, pass: SMTP_PASS }
});

const REPLY_TO = 'oddfellowcoffee@birdherd.media';

function esc(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

const BRAND = {
	red: '#B33935',
	dark: '#1a1a1a',
	lightBg: '#f9f6f2',
	border: '#e8e0d8',
	textMuted: '#6b6560',
	logoUrl: `${SITE_URL}/assets/logo.jpeg`,
	siteUrl: SITE_URL
};

function emailShell(content: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Odd Fellow Coffee</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.lightBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.lightBg};">
<tr><td align="center" style="padding:24px 16px;">

<!-- Main container -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

<!-- Header -->
<tr>
<td style="background-color:${BRAND.dark};padding:28px 40px;text-align:center;">
<img src="${BRAND.logoUrl}" alt="Odd Fellow Coffee" width="60" height="60" style="border-radius:50%;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;">
<span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">ODD FELLOW COFFEE</span>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:36px 40px 24px;">
${content}
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:24px 40px 32px;border-top:1px solid ${BRAND.border};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="color:${BRAND.textMuted};font-size:12px;line-height:1.6;">
<p style="margin:0 0 4px;">Odd Fellow Coffee Roasters</p>
<p style="margin:0 0 4px;">Tonkawa, Oklahoma</p>
<p style="margin:0;"><a href="${BRAND.siteUrl}" style="color:${BRAND.red};text-decoration:none;">oddfellowcoffee.com</a></p>
</td>
<td align="right" valign="top" style="color:${BRAND.textMuted};font-size:12px;">
<a href="${BRAND.siteUrl}/shop" style="color:${BRAND.textMuted};text-decoration:none;margin-right:12px;">Shop</a>
<a href="${BRAND.siteUrl}/subscriptions" style="color:${BRAND.textMuted};text-decoration:none;">My Subscriptions</a>
</td>
</tr>
</table>
</td>
</tr>

</table>
<!-- /Main container -->

</td></tr>
</table>
</body>
</html>`;
}

function btn(href: string, label: string, color = BRAND.dark): string {
	return `<a href="${esc(href)}" style="display:inline-block;padding:14px 32px;background-color:${color};color:#ffffff;text-decoration:none;border-radius:30px;font-weight:600;font-size:14px;letter-spacing:0.5px;">${label}</a>`;
}

function divider(): string {
	return `<hr style="border:none;border-top:1px solid ${BRAND.border};margin:24px 0;">`;
}

interface OrderItem {
	productId: number;
	name?: string;
	quantity: number;
	price_cents: number;
	variant?: string;
}

interface OrderData {
	id: number;
	items: OrderItem[];
	totalCents: number;
	shippingMethod?: string;
	shippingCents?: number;
	shippingAddress?: {
		line1: string;
		line2?: string;
		city: string;
		state: string;
		postal_code: string;
	};
}

function receiptTable(order: OrderData): string {
	const itemRows = order.items
		.map(
			(item) => `
<tr>
<td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;">
${esc(item.name || `Product #${item.productId}`)}${item.variant ? `<br><span style="color:${BRAND.textMuted};font-size:12px;">${esc(item.variant)}</span>` : ''}
</td>
<td align="center" style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.textMuted};">${item.quantity}</td>
<td align="right" style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;">$${(item.price_cents / 100).toFixed(2)}</td>
</tr>`
		)
		.join('');

	const subtotalCents = order.items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
	const shippingCents = order.shippingCents || 0;

	return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
<tr style="background-color:${BRAND.lightBg};">
<td style="padding:8px 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Item</td>
<td align="center" style="padding:8px 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Qty</td>
<td align="right" style="padding:8px 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Price</td>
</tr>
${itemRows}
<tr>
<td colspan="2" align="right" style="padding:8px 12px 4px;font-size:13px;color:${BRAND.textMuted};">Subtotal</td>
<td align="right" style="padding:8px 12px 4px;font-size:13px;">$${(subtotalCents / 100).toFixed(2)}</td>
</tr>
<tr>
<td colspan="2" align="right" style="padding:4px 12px;font-size:13px;color:${BRAND.textMuted};">Shipping${order.shippingMethod ? ` (${esc(order.shippingMethod.replace(/ \(.*\)/, ''))})` : ''}</td>
<td align="right" style="padding:4px 12px;font-size:13px;">${shippingCents === 0 ? 'FREE' : '$' + (shippingCents / 100).toFixed(2)}</td>
</tr>
<tr>
<td colspan="2" align="right" style="padding:12px 12px 4px;font-size:16px;font-weight:700;border-top:2px solid ${BRAND.dark};">Total</td>
<td align="right" style="padding:12px 12px 4px;font-size:16px;font-weight:700;border-top:2px solid ${BRAND.dark};">$${(order.totalCents / 100).toFixed(2)}</td>
</tr>
</table>`;
}

function shippingBlock(address?: OrderData['shippingAddress'], name?: string): string {
	if (!address) return '';
	return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:${BRAND.lightBg};border-radius:8px;padding:16px;width:100%;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Shipping To</p>
<p style="margin:0;font-size:14px;line-height:1.6;">
${name ? esc(name) + '<br>' : ''}
${esc(address.line1)}${address.line2 ? '<br>' + esc(address.line2) : ''}<br>
${esc(address.city)}, ${esc(address.state)} ${esc(address.postal_code)}
</p>
</td></tr>
</table>`;
}

// ─── Estimated Arrival ──────────────────────────────────────────

function estimatedArrivalBlock(shippingMethod?: string): string {
	const isPickup = shippingMethod?.toLowerCase().includes('pickup');
	const isLocal = shippingMethod?.toLowerCase().includes('local') && !isPickup;

	if (isPickup) {
		return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid ${BRAND.border};border-radius:8px;width:100%;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Pickup Instructions</p>
<p style="margin:0 0 4px;font-size:18px;font-weight:700;color:${BRAND.dark};">Ready for pickup</p>
<p style="margin:0 0 8px;font-size:13px;color:${BRAND.textMuted};">Available Monday & Friday at 4:00 PM</p>
<p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Pickup address will be provided separately. Reply to this email if you need directions.</p>
</td></tr>
</table>`;
	}

	if (isLocal) {
		return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid ${BRAND.border};border-radius:8px;width:100%;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Local Delivery</p>
<p style="margin:0 0 4px;font-size:18px;font-weight:700;color:${BRAND.dark};">1-2 business days</p>
<p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Your order will be hand-delivered to the Tonkawa area. Deliveries go out Monday & Friday at 5:30 PM.</p>
</td></tr>
</table>`;
	}

	return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid ${BRAND.border};border-radius:8px;width:100%;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Estimated Arrival</p>
<p style="margin:0 0 4px;font-size:18px;font-weight:700;color:${BRAND.dark};">3-7 business days</p>
<p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Your order is freshly roasted to order. Please allow time for roasting and shipping.</p>
</td></tr>
</table>`;
}

// ─── Email Functions ────────────────────────────────────────────

export async function sendOrderConfirmation(email: string, name: string, order: OrderData) {
	const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Order Confirmed</p>
<h1 style="margin:0 0 8px;font-size:28px;color:${BRAND.dark};">Thanks, ${esc(name)}!</h1>
<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">Your order <strong style="color:${BRAND.dark};">#${order.id}</strong> has been received and is being prepared.</p>

${estimatedArrivalBlock(order.shippingMethod)}

${divider()}

<p style="margin:0 0 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Order Summary</p>
${receiptTable(order)}

${shippingBlock(order.shippingAddress, name)}

${divider()}

<p style="text-align:center;margin:0 0 16px;">
${btn(BRAND.siteUrl + '/shop', 'Continue Shopping')}
</p>

<p style="text-align:center;margin:0;font-size:13px;color:${BRAND.textMuted};">Questions about your order? Reply to this email and we'll help you out.</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		replyTo: REPLY_TO,
		to: email,
		subject: `Order #${order.id} Confirmed - Odd Fellow Coffee`,
		html
	});
}

export interface ReservationEmailData {
	date: string;
	timeSlot: string;
	drinks: { name: string; quantity: number }[];
	totalCents: number;
	pickupLocation?: string | null;
}

/** Human pickup window: "14:45-15:15" -> "2:45 - 3:15 PM". */
function prettyWindow(timeSlot: string): string {
	if (!timeSlot || !timeSlot.trim()) return 'your pickup window';
	const parts = timeSlot.split('-');
	if (parts.length !== 2) return timeSlot;
	const to12 = (hhmm: string): { text: string; suffix: string } | null => {
		const [h, m] = hhmm.split(':').map(Number);
		if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
		const suffix = h >= 12 ? 'PM' : 'AM';
		const hour = h % 12 === 0 ? 12 : h % 12;
		return { text: hour + ':' + String(m).padStart(2, '0'), suffix };
	};
	const a = to12(parts[0]);
	const b = to12(parts[1]);
	if (!a || !b) return timeSlot;
	return a.suffix === b.suffix
		? a.text + ' - ' + b.text + ' ' + b.suffix
		: a.text + ' ' + a.suffix + ' - ' + b.text + ' ' + b.suffix;
}

/** Friendly date: "2026-11-20" -> "Friday, November 20". */
function prettyDate(date: string): string {
	// Fail to a readable phrase, never an empty string: the subject line
	// "Order confirmed for  - Odd Fellow Coffee" is worse than being vague.
	if (!date || !date.trim()) return 'your pickup day';
	const [y, m, d] = date.split('-').map(Number);
	if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
		return 'your pickup day';
	}
	const dt = new Date(Date.UTC(y, m - 1, d));
	if (Number.isNaN(dt.getTime())) return 'your pickup day';
	return dt.toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC'
	});
}

function drinkRows(drinks: { name: string; quantity: number }[]): string {
	return drinks
		.map(
			(d) =>
				'<tr><td style="padding:6px 0;font-size:15px;color:' +
				BRAND.dark +
				';">' +
				esc(d.name) +
				'</td><td style="padding:6px 0;font-size:15px;text-align:right;color:' +
				BRAND.dark +
				';">&times;' +
				d.quantity +
				'</td></tr>'
		)
		.join('');
}

export async function sendReservationConfirmation(
	email: string,
	name: string,
	details: ReservationEmailData
) {
	const when = prettyDate(details.date);
	const pickupWindow = prettyWindow(details.timeSlot);
	const locationBlock = details.pickupLocation
		? '<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:' +
			BRAND.textMuted +
			';">Pickup</p><p style="margin:0 0 20px;font-size:16px;color:' +
			BRAND.dark +
			';">' +
			esc(details.pickupLocation) +
			'</p>'
		: '<p style="margin:0 0 20px;font-size:14px;color:' +
			BRAND.textMuted +
			';">We will confirm the pickup spot by email before your order is ready.</p>';

	const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Order Confirmed</p>
<h1 style="margin:0 0 24px;font-size:28px;color:${BRAND.dark};">Thanks, ${esc(name || 'friend')}!</h1>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.lightBg};border-radius:8px;width:100%;">
<tr><td style="padding:20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="50%" valign="top">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Day</p>
<p style="margin:0;font-size:18px;font-weight:700;color:${BRAND.dark};">${esc(when)}</p>
</td>
<td width="50%" valign="top">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Ready</p>
<p style="margin:0;font-size:18px;font-weight:700;color:${BRAND.dark};">${esc(pickupWindow)}</p>
</td>
</tr>
</table>
</td></tr>
</table>

${locationBlock}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
${drinkRows(details.drinks)}
<tr><td colspan="2" style="border-top:1px solid ${BRAND.border};padding-top:10px;"></td></tr>
<tr>
<td style="font-size:16px;font-weight:700;color:${BRAND.dark};">Total paid</td>
<td style="font-size:16px;font-weight:700;text-align:right;color:${BRAND.dark};">$${(details.totalCents / 100).toFixed(2)}</td>
</tr>
</table>

<p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">Made fresh for your pickup window. If you need to change or cancel, just reply to this email.</p>

${divider()}

<p style="text-align:center;margin:0;">
${btn(BRAND.siteUrl, 'Visit Our Site')}
</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		replyTo: REPLY_TO,
		to: email,
		subject: `Order confirmed for ${when} - Odd Fellow Coffee`,
		html
	});
}

/** Deborah needs to know the moment a drink sells, so she can plan the batch. */
export async function sendOwnerReservationNotification(
	ownerEmail: string,
	customerName: string,
	customerEmail: string,
	details: ReservationEmailData,
	revived = false
) {
	const when = prettyDate(details.date);
	const pickupWindow = prettyWindow(details.timeSlot);
	const totalDrinks = details.drinks.reduce((sum, d) => sum + d.quantity, 0);
	// A revived reservation was paid after its hold was released, so the slot may
	// now be over its planned capacity. Deborah must see that at a glance.
	const warning = revived
		? '<p style="margin:0 0 20px;padding:12px;border-radius:6px;background-color:#fdecea;font-size:14px;color:#8a1c13;"><strong>Heads up:</strong> this order was paid after its hold had expired, so this slot may be over its planned capacity. Check the run sheet before you brew.</p>'
		: '';
	const plural = totalDrinks === 1 ? '' : 's';

	const html = emailShell(`
${warning}
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">New Drink Order</p>
<h1 style="margin:0 0 24px;font-size:28px;color:${BRAND.dark};">${totalDrinks} drink${plural} for ${esc(when)}</h1>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.lightBg};border-radius:8px;width:100%;">
<tr><td style="padding:20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${drinkRows(details.drinks)}
</table>
<p style="margin:16px 0 0;font-size:14px;color:${BRAND.textMuted};">Pickup window <strong style="color:${BRAND.dark};">${esc(pickupWindow)}</strong></p>
</td></tr>
</table>

<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Customer</p>
<p style="margin:0 0 20px;font-size:15px;color:${BRAND.dark};">${esc(customerName || 'No name given')}<br>${esc(customerEmail || 'No email given')}</p>

<p style="margin:0;font-size:16px;font-weight:700;color:${BRAND.dark};">Paid $${(details.totalCents / 100).toFixed(2)}</p>

${divider()}

<p style="text-align:center;margin:0;">
${btn(BRAND.siteUrl + '/admin/drinks', 'Run Sheet')}
</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		replyTo: REPLY_TO,
		to: ownerEmail,
		subject: `${revived ? '[OVER CAPACITY] ' : ''}New: ${totalDrinks} drink${plural} for ${when} (${pickupWindow})`,
		html
	});
}

export interface RunSheetSlot {
	label: string;
	confirmed_drinks: number;
	tally: Record<string, number>;
}

/**
 * Deborah's morning run sheet. The point is the batch numbers — how many of
 * each drink, in which window — not a list of orders.
 */
export async function sendOwnerRunSheet(
	ownerEmail: string,
	date: string,
	slots: RunSheetSlot[],
	pickupLocation: string | null
) {
	const when = prettyDate(date);
	const total = slots.reduce((sum, s) => sum + s.confirmed_drinks, 0);

	const slotBlocks = slots
		.map(
			(s) =>
				'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background-color:' +
				BRAND.lightBg +
				';border-radius:8px;"><tr><td style="padding:16px;">' +
				'<p style="margin:0 0 10px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:' +
				BRAND.textMuted +
				';">' +
				esc(prettyWindow(s.label)) +
				'</p>' +
				(Object.keys(s.tally).length
					? Object.entries(s.tally)
							.map(
								([n, q]) =>
									'<p style="margin:0 0 4px;font-size:18px;color:' +
									BRAND.dark +
									';"><strong>' +
									q +
									'</strong> &times; ' +
									esc(n) +
									'</p>'
							)
							.join('')
					: s.confirmed_drinks > 0
						? // Paid drinks exist but their line items could not be read. Saying
							// "nothing booked" would tell her to make nothing for a window that
							// has orders in it.
							'<p style="margin:0;font-size:18px;color:' +
							BRAND.dark +
							';"><strong>' +
							s.confirmed_drinks +
							'</strong> drinks (details unavailable)</p>'
						: '<p style="margin:0;font-size:15px;color:' +
							BRAND.textMuted +
							';">Nothing booked.</p>') +
				'</td></tr></table>'
		)
		.join('');

	const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Run Sheet</p>
<h1 style="margin:0 0 8px;font-size:28px;color:${BRAND.dark};">${total} drink${total === 1 ? '' : 's'} today</h1>
<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">${esc(when)}${pickupLocation ? ' &middot; ' + esc(pickupLocation) : ''}</p>

${slotBlocks}

<p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">Paid orders only. Unpaid holds are not counted here — check the run sheet in the admin for those.</p>

${divider()}

<p style="text-align:center;margin:0;">
${btn(BRAND.siteUrl + '/admin/drinks', 'Open the run sheet')}
</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		replyTo: REPLY_TO,
		to: ownerEmail,
		subject: `${total} drink${total === 1 ? '' : 's'} to make today - ${when}`,
		html
	});
}

/** Pickup-day nudge, sent the morning of. */
export async function sendPickupReminder(
	email: string,
	name: string,
	details: ReservationEmailData
) {
	const pickupWindow = prettyWindow(details.timeSlot);
	const locationLine = details.pickupLocation
		? '<p style="margin:0 0 20px;font-size:16px;color:' +
			BRAND.dark +
			';">Pickup at <strong>' +
			esc(details.pickupLocation) +
			'</strong></p>'
		: '';

	const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Today</p>
<h1 style="margin:0 0 24px;font-size:28px;color:${BRAND.dark};">Your drinks are ready at ${esc(pickupWindow)}</h1>

<p style="margin:0 0 16px;font-size:16px;color:${BRAND.dark};">${esc(name || 'Hi there')} &mdash; here is what we are making for you:</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
${drinkRows(details.drinks)}
</table>

${locationLine}

<p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">Already paid for &mdash; just come and get it. Reply to this email if anything has changed.</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		replyTo: REPLY_TO,
		to: email,
		subject: `Ready today at ${pickupWindow} - Odd Fellow Coffee`,
		html
	});
}

export async function sendSubscriptionConfirmation(
	email: string,
	productName: string,
	variant: string | null,
	frequency: string,
	priceCents: number,
	shippingCents: number,
	nextDeliveryDate: string
) {
	const variantText = variant ? ` (${esc(variant)})` : '';
	const freqLabel =
		frequency === 'weekly' ? 'Weekly' : frequency === 'biweekly' ? 'Every 2 Weeks' : 'Monthly';
	const freqShort = frequency === 'weekly' ? '/wk' : frequency === 'biweekly' ? '/2wk' : '/mo';
	const totalCents = priceCents + shippingCents;

	const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Subscription Confirmed</p>
<h1 style="margin:0 0 8px;font-size:28px;color:${BRAND.dark};">Welcome to the club!</h1>
<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">Your subscription is all set. ${esc(productName)}, delivered on your schedule.</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.lightBg};border-radius:8px;width:100%;">
<tr><td style="padding:20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td>
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Your Subscription</p>
<p style="margin:0 0 8px;font-size:16px;font-weight:700;color:${BRAND.dark};">${esc(productName)}${variantText}</p>
<p style="margin:0 0 4px;font-size:14px;color:${BRAND.textMuted};">${freqLabel} delivery</p>
</td>
</tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;border-top:1px solid ${BRAND.border};padding-top:12px;">
<tr>
<td style="font-size:13px;color:${BRAND.textMuted};">${esc(productName)}</td>
<td align="right" style="font-size:13px;">$${(priceCents / 100).toFixed(2)}</td>
</tr>
<tr>
<td style="font-size:13px;color:${BRAND.textMuted};">Shipping</td>
<td align="right" style="font-size:13px;">${shippingCents === 0 ? 'FREE' : '$' + (shippingCents / 100).toFixed(2)}</td>
</tr>
<tr>
<td style="padding-top:8px;border-top:1px solid ${BRAND.border};font-size:15px;font-weight:700;">Total</td>
<td align="right" style="padding-top:8px;border-top:1px solid ${BRAND.border};font-size:15px;font-weight:700;">$${(totalCents / 100).toFixed(2)}${freqShort}</td>
</tr>
</table>
</td></tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid ${BRAND.border};border-radius:8px;width:100%;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">First Delivery</p>
<p style="margin:0;font-size:18px;font-weight:700;color:${BRAND.dark};">${esc(nextDeliveryDate)}</p>
</td></tr>
</table>

${divider()}

<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${BRAND.dark};">Managing Your Subscription</p>
<p style="margin:0 0 16px;font-size:13px;color:${BRAND.textMuted};line-height:1.6;">
You're in control. Visit your subscription page anytime to view your delivery schedule, see upcoming orders, or adjust your plan. Just enter the email address you used to subscribe.
</p>
<p style="text-align:center;margin:0 0 16px;">
${btn(BRAND.siteUrl + '/subscriptions', 'My Subscription')}
</p>

<p style="text-align:center;margin:0;font-size:13px;color:${BRAND.textMuted};">Questions about your subscription? Just reply to this email and we'll help you out.</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		replyTo: REPLY_TO,
		to: email,
		subject: 'Welcome to Your Coffee Subscription! - Odd Fellow Coffee',
		html
	});
}

export async function sendCancellationConfirmation(email: string, productName: string) {
	const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Subscription Update</p>
<h1 style="margin:0 0 8px;font-size:28px;color:${BRAND.dark};">We're sorry to see you go</h1>
<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">Your subscription for <strong style="color:${BRAND.dark};">${esc(productName)}</strong> has been set to cancel at the end of your current billing period.</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.lightBg};border-radius:8px;width:100%;">
<tr><td style="padding:20px;">
<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${BRAND.dark};">What happens next?</p>
<ul style="margin:0;padding:0 0 0 20px;font-size:14px;color:${BRAND.textMuted};line-height:1.8;">
<li>You'll continue to receive deliveries until your period ends</li>
<li>No further charges will be made after that</li>
<li>You can resubscribe anytime from our shop</li>
</ul>
</td></tr>
</table>

<p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">Changed your mind? You can manage your subscription anytime.</p>

<p style="text-align:center;margin:20px 0 0;">
${btn(BRAND.siteUrl + '/subscriptions', 'Manage Subscription')}
</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		replyTo: REPLY_TO,
		to: email,
		subject: 'Subscription Canceled - Odd Fellow Coffee',
		html
	});
}

export async function sendOwnerSubscriptionNotification(
	ownerEmail: string,
	customerEmail: string,
	productName: string,
	variant: string | null,
	frequency: string,
	priceCents: number,
	shippingName: string | null,
	shippingAddress: {
		line1: string;
		line2?: string;
		city: string;
		state: string;
		postal_code: string;
	} | null,
	nextDeliveryDate: string
) {
	const variantText = variant ? ` (${esc(variant)})` : '';
	const freqLabel =
		frequency === 'weekly' ? 'Weekly' : frequency === 'biweekly' ? 'Every 2 Weeks' : 'Monthly';

	const addrBlock = shippingAddress
		? `<p style="margin:8px 0 0;font-size:14px;line-height:1.6;">
${esc(shippingAddress.line1)}${shippingAddress.line2 ? '<br>' + esc(shippingAddress.line2) : ''}<br>
${esc(shippingAddress.city)}, ${esc(shippingAddress.state)} ${esc(shippingAddress.postal_code)}
</p>`
		: '<p style="margin:8px 0 0;font-size:14px;color:' +
			BRAND.textMuted +
			';">No address provided</p>';

	const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">New Subscription</p>
<h1 style="margin:0 0 8px;font-size:28px;color:${BRAND.dark};">New Subscriber!</h1>
<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">
<strong style="color:${BRAND.dark};">${esc(customerEmail)}</strong> just subscribed.
</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.lightBg};border-radius:8px;width:100%;">
<tr><td style="padding:20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td>
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Subscription Details</p>
<p style="margin:0 0 8px;font-size:16px;font-weight:700;color:${BRAND.dark};">${esc(productName)}${variantText}</p>
<p style="margin:0 0 4px;font-size:14px;color:${BRAND.textMuted};">${freqLabel} — $${(priceCents / 100).toFixed(2)}/delivery</p>
</td>
</tr>
</table>
</td></tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid ${BRAND.border};border-radius:8px;width:100%;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">First Delivery</p>
<p style="margin:0;font-size:18px;font-weight:700;color:${BRAND.dark};">${esc(nextDeliveryDate)}</p>
</td></tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.lightBg};border-radius:8px;width:100%;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Ship To</p>
${shippingName ? `<p style="margin:0 0 4px;font-size:14px;font-weight:600;color:${BRAND.dark};">${esc(shippingName)}</p>` : ''}
${addrBlock}
</td></tr>
</table>

${divider()}

<p style="text-align:center;margin:0;">
${btn(BRAND.siteUrl + '/admin/subscriptions', 'View in Admin')}
</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		replyTo: REPLY_TO,
		to: ownerEmail,
		subject: `New Subscription — ${customerEmail} (${productName})`,
		html
	});
}

export async function sendDeliveryDayReminder(
	email: string,
	productName: string,
	variant: string | null,
	shippingMethod: string | null,
	shippingAddress: {
		line1: string;
		line2?: string;
		city: string;
		state: string;
		postal_code: string;
	} | null
) {
	const variantText = variant ? ` (${esc(variant)})` : '';
	const isLocal = !shippingAddress || shippingAddress.postal_code === '74653';

	const deliveryInfo = isLocal
		? `<p style="margin:0 0 4px;font-size:18px;font-weight:700;color:${BRAND.dark};">Local delivery today</p>
<p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Your order will be hand-delivered this evening by 5:30 PM.</p>`
		: `<p style="margin:0 0 4px;font-size:18px;font-weight:700;color:${BRAND.dark};">Shipping today</p>
<p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Your freshly roasted coffee is being prepared for shipment.</p>`;

	const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Delivery Day</p>
<h1 style="margin:0 0 8px;font-size:28px;color:${BRAND.dark};">Your coffee is on its way!</h1>
<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">Your subscription delivery is scheduled for today.</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.lightBg};border-radius:8px;width:100%;">
<tr><td style="padding:20px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Today's Delivery</p>
<p style="margin:0;font-size:16px;font-weight:700;color:${BRAND.dark};">${esc(productName)}${variantText}</p>
</td></tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid ${BRAND.border};border-radius:8px;width:100%;">
<tr><td style="padding:16px;">
${deliveryInfo}
</td></tr>
</table>

${
	shippingAddress
		? `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.lightBg};border-radius:8px;width:100%;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Delivering To</p>
<p style="margin:0;font-size:14px;line-height:1.6;">
${esc(shippingAddress.line1)}${shippingAddress.line2 ? '<br>' + esc(shippingAddress.line2) : ''}<br>
${esc(shippingAddress.city)}, ${esc(shippingAddress.state)} ${esc(shippingAddress.postal_code)}
</p>
</td></tr>
</table>`
		: ''
}

${divider()}

<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${BRAND.dark};">Manage Your Subscription</p>
<p style="margin:0 0 16px;font-size:13px;color:${BRAND.textMuted};line-height:1.6;">
Visit your subscription page to view your delivery schedule, update your preferences, or adjust your plan.
</p>
<p style="text-align:center;margin:0 0 16px;">
${btn(BRAND.siteUrl + '/subscriptions', 'My Subscription')}
</p>

<p style="text-align:center;margin:0;font-size:13px;color:${BRAND.textMuted};">Questions? Just reply to this email.</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		replyTo: REPLY_TO,
		to: email,
		subject: 'Your Coffee Is Coming Today! - Odd Fellow Coffee',
		html
	});
}

interface DeliveryDigestItem {
	customerEmail: string;
	shippingName: string | null;
	productName: string;
	variant: string | null;
	frequency: string;
	shippingAddress: {
		line1: string;
		line2?: string;
		city: string;
		state: string;
		postal_code: string;
	} | null;
}

export async function sendOwnerDailyDigest(
	ownerEmail: string,
	deliveries: DeliveryDigestItem[],
	dateStr: string
) {
	if (deliveries.length === 0) return;

	const rows = deliveries
		.map((d, i) => {
			const addr = d.shippingAddress
				? `${esc(d.shippingAddress.line1)}, ${esc(d.shippingAddress.city)}, ${esc(d.shippingAddress.state)} ${esc(d.shippingAddress.postal_code)}`
				: 'No address';
			const variantText = d.variant ? ` (${esc(d.variant)})` : '';
			return `
<tr style="${i % 2 === 1 ? 'background-color:' + BRAND.lightBg + ';' : ''}">
<td style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};font-size:14px;">
<strong>${esc(d.shippingName || d.customerEmail)}</strong><br>
<span style="color:${BRAND.textMuted};font-size:12px;">${esc(d.customerEmail)}</span>
</td>
<td style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};font-size:14px;">${esc(d.productName)}${variantText}</td>
<td style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};font-size:13px;color:${BRAND.textMuted};">${esc(addr)}</td>
</tr>`;
		})
		.join('');

	const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Daily Delivery Digest</p>
<h1 style="margin:0 0 8px;font-size:28px;color:${BRAND.dark};">Today's Deliveries</h1>
<p style="margin:0 0 4px;font-size:15px;color:${BRAND.textMuted};">${esc(dateStr)}</p>
<p style="margin:0 0 24px;font-size:18px;font-weight:700;color:${BRAND.dark};">${deliveries.length} delivery${deliveries.length === 1 ? '' : 'ies'} to fulfill</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr style="background-color:${BRAND.dark};">
<td style="padding:10px 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#ffffff;">Customer</td>
<td style="padding:10px 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#ffffff;">Product</td>
<td style="padding:10px 12px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#ffffff;">Address</td>
</tr>
${rows}
</table>

${divider()}

<p style="text-align:center;margin:0;">
${btn(BRAND.siteUrl + '/admin/subscriptions', 'Open Admin Panel')}
</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		replyTo: REPLY_TO,
		to: ownerEmail,
		subject: `${deliveries.length} Delivery${deliveries.length === 1 ? '' : 'ies'} Today — ${dateStr}`,
		html
	});
}

export async function sendPaymentFailed(email: string, updateUrl: string) {
	const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.red};">Action Required</p>
<h1 style="margin:0 0 8px;font-size:28px;color:${BRAND.dark};">Payment issue with your subscription</h1>
<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">We had trouble processing your recent subscription payment. Please update your payment method to keep your deliveries coming.</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:2px solid ${BRAND.red};border-radius:8px;width:100%;">
<tr><td style="padding:20px;text-align:center;">
<p style="margin:0 0 16px;font-size:14px;color:${BRAND.textMuted};">Update your payment method to avoid interruption:</p>
${btn(updateUrl, 'Update Payment Method', BRAND.red)}
</td></tr>
</table>

<p style="font-size:13px;color:${BRAND.textMuted};line-height:1.6;">If you've already updated your payment or believe this is an error, no action is needed. Questions? Just reply to this email.</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		replyTo: REPLY_TO,
		to: email,
		subject: 'Payment Failed - Action Required - Odd Fellow Coffee',
		html
	});
}

export async function sendOwnerOrderNotification(
	ownerEmail: string,
	customerName: string,
	customerEmail: string,
	order: OrderData
) {
	const addrBlock = order.shippingAddress
		? `<p style="margin:8px 0 0;font-size:14px;line-height:1.6;">
${esc(order.shippingAddress.line1)}${order.shippingAddress.line2 ? '<br>' + esc(order.shippingAddress.line2) : ''}<br>
${esc(order.shippingAddress.city)}, ${esc(order.shippingAddress.state)} ${esc(order.shippingAddress.postal_code)}
</p>`
		: '';

	const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">New Order</p>
<h1 style="margin:0 0 8px;font-size:28px;color:${BRAND.dark};">Order #${order.id}</h1>
<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">
<strong style="color:${BRAND.dark};">${esc(customerName)}</strong> (${esc(customerEmail)})
</p>

${receiptTable(order)}

${
	order.shippingMethod
		? `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:${BRAND.lightBg};border-radius:8px;width:100%;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Fulfillment</p>
<p style="margin:0;font-size:14px;font-weight:600;color:${BRAND.dark};">${esc(order.shippingMethod)}</p>
${customerName ? `<p style="margin:4px 0 0;font-size:14px;color:${BRAND.textMuted};">${esc(customerName)}</p>` : ''}
${addrBlock}
</td></tr>
</table>`
		: ''
}
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee Orders" <${FROM_EMAIL}>`,
		replyTo: REPLY_TO,
		to: ownerEmail,
		subject: `New Order #${order.id} — ${customerName || customerEmail}`,
		html
	});
}

export async function sendSubscriptionFulfilled(
	email: string,
	productName: string,
	variant: string | null,
	nextDeliveryDate: string
) {
	const variantText = variant ? ` (${esc(variant)})` : '';
	const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Shipment Update</p>
<h1 style="margin:0 0 8px;font-size:28px;color:${BRAND.dark};">Your coffee is on its way!</h1>
<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">Your subscription order has been freshly roasted and shipped.</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.lightBg};border-radius:8px;width:100%;">
<tr><td style="padding:20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td>
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">What's in the box</p>
<p style="margin:0;font-size:16px;font-weight:700;color:${BRAND.dark};">${esc(productName)}${variantText}</p>
</td>
</tr>
</table>
</td></tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid ${BRAND.border};border-radius:8px;width:100%;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Next Delivery</p>
<p style="margin:0;font-size:18px;font-weight:700;color:${BRAND.dark};">${esc(nextDeliveryDate)}</p>
</td></tr>
</table>

${divider()}

<p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${BRAND.dark};">Manage Your Subscription</p>
<p style="margin:0 0 16px;font-size:13px;color:${BRAND.textMuted};line-height:1.6;">
View your delivery schedule, see upcoming orders, or adjust your plan anytime.
</p>
<p style="text-align:center;margin:0 0 16px;">
${btn(BRAND.siteUrl + '/subscriptions', 'My Subscription')}
</p>

<p style="text-align:center;margin:0;font-size:13px;color:${BRAND.textMuted};">Enjoying your coffee? Tell a friend! Questions? Reply to this email.</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		replyTo: REPLY_TO,
		to: email,
		subject: 'Your Coffee Has Shipped! - Odd Fellow Coffee',
		html
	});
}
