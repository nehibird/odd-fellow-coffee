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
	shippingAddress?: { line1: string; line2?: string; city: string; state: string; postal_code: string };
}

function receiptTable(order: OrderData): string {
	const itemRows = order.items.map(item => `
<tr>
<td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;">
${esc(item.name || `Product #${item.productId}`)}${item.variant ? `<br><span style="color:${BRAND.textMuted};font-size:12px;">${esc(item.variant)}</span>` : ''}
</td>
<td align="center" style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.textMuted};">${item.quantity}</td>
<td align="right" style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;">$${(item.price_cents / 100).toFixed(2)}</td>
</tr>`).join('');

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

export async function sendOrderConfirmation(
	email: string,
	name: string,
	order: OrderData
) {
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
		to: email,
		subject: `Order #${order.id} Confirmed - Odd Fellow Coffee`,
		html
	});
}

export async function sendReservationConfirmation(
	email: string,
	name: string,
	date: string,
	timeSlot: string
) {
	const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Reservation Confirmed</p>
<h1 style="margin:0 0 24px;font-size:28px;color:${BRAND.dark};">See you there, ${esc(name)}!</h1>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.lightBg};border-radius:8px;width:100%;">
<tr><td style="padding:20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="50%">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Date</p>
<p style="margin:0;font-size:18px;font-weight:700;color:${BRAND.dark};">${esc(date)}</p>
</td>
<td width="50%">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Time</p>
<p style="margin:0;font-size:18px;font-weight:700;color:${BRAND.dark};">${esc(timeSlot)}</p>
</td>
</tr>
</table>
</td></tr>
</table>

<p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">We'll have a spot waiting for you. If you need to change or cancel your reservation, just reply to this email.</p>

${divider()}

<p style="text-align:center;margin:0;">
${btn(BRAND.siteUrl, 'Visit Our Site')}
</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		to: email,
		subject: `Reservation Confirmed for ${date} - Odd Fellow Coffee`,
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
	const freqLabel = frequency === 'weekly' ? 'Weekly' : frequency === 'biweekly' ? 'Every 2 Weeks' : 'Monthly';
	const freqShort = frequency === 'weekly' ? '/wk' : frequency === 'biweekly' ? '/2wk' : '/mo';
	const totalCents = priceCents + shippingCents;

	const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Subscription Confirmed</p>
<h1 style="margin:0 0 8px;font-size:28px;color:${BRAND.dark};">Welcome to the club!</h1>
<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">Your subscription is all set. Fresh-roasted coffee, delivered on your schedule.</p>

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
<td style="font-size:13px;color:${BRAND.textMuted};">Coffee</td>
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

<p style="text-align:center;margin:0 0 16px;">
${btn(BRAND.siteUrl + '/subscriptions', 'Manage Subscription')}
</p>

<p style="text-align:center;margin:0;font-size:13px;color:${BRAND.textMuted};">You can pause or cancel anytime. Questions? Just reply to this email.</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		to: email,
		subject: 'Subscription Confirmed - Odd Fellow Coffee',
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
		to: email,
		subject: 'Subscription Canceled - Odd Fellow Coffee',
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

${order.shippingMethod ? `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:${BRAND.lightBg};border-radius:8px;width:100%;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Fulfillment</p>
<p style="margin:0;font-size:14px;font-weight:600;color:${BRAND.dark};">${esc(order.shippingMethod)}</p>
${customerName ? `<p style="margin:4px 0 0;font-size:14px;color:${BRAND.textMuted};">${esc(customerName)}</p>` : ''}
${addrBlock}
</td></tr>
</table>` : ''}
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee Orders" <${FROM_EMAIL}>`,
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

<p style="text-align:center;margin:0 0 16px;">
${btn(BRAND.siteUrl + '/subscriptions', 'Manage Subscription')}
</p>

<p style="text-align:center;margin:0;font-size:13px;color:${BRAND.textMuted};">Enjoying your coffee? Tell a friend!</p>
`);

	await transporter.sendMail({
		from: `"Odd Fellow Coffee" <${FROM_EMAIL}>`,
		to: email,
		subject: 'Your Coffee Has Shipped! - Odd Fellow Coffee',
		html
	});
}
