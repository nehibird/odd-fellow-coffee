import nodemailer from 'nodemailer';
import {
	SMTP_HOST,
	SMTP_PORT,
	SMTP_USER,
	SMTP_PASS,
	FROM_EMAIL
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

export async function sendOrderConfirmation(email: string, name: string, orderId: number, totalCents: number) {
	await transporter.sendMail({
		from: FROM_EMAIL,
		to: email,
		subject: `Odd Fellow Coffee - Order #${orderId} Confirmed`,
		html: `
			<h2>Thanks for your order, ${esc(name)}!</h2>
			<p>Order #${esc(String(orderId))}</p>
			<p>Total: $${(totalCents / 100).toFixed(2)}</p>
			<p>We'll have it ready for you soon.</p>
			<p>- Odd Fellow Coffee Roasters</p>
		`
	});
}

export async function sendReservationConfirmation(
	email: string,
	name: string,
	date: string,
	timeSlot: string
) {
	await transporter.sendMail({
		from: FROM_EMAIL,
		to: email,
		subject: 'Odd Fellow Coffee - Reservation Confirmed',
		html: `
			<h2>Reservation Confirmed, ${esc(name)}!</h2>
			<p>Date: ${esc(date)}</p>
			<p>Time: ${esc(timeSlot)}</p>
			<p>See you then!</p>
			<p>- Odd Fellow Coffee Roasters</p>
		`
	});
}

export async function sendCancellationConfirmation(email: string, productName: string) {
	await transporter.sendMail({
		from: FROM_EMAIL,
		to: email,
		subject: 'Odd Fellow Coffee - Subscription Canceled',
		html: `
			<h2>We're sorry to see you go</h2>
			<p>Your subscription for <strong>${esc(productName)}</strong> has been set to cancel at the end of your current billing period.</p>
			<p>You'll continue to receive your deliveries until then.</p>
			<p>If you change your mind, you can resubscribe anytime at our store.</p>
			<p>Thanks for being a customer — we hope to see you again!</p>
			<p>- Odd Fellow Coffee Roasters</p>
		`
	});
}

export async function sendPaymentFailed(email: string, updateUrl: string) {
	await transporter.sendMail({
		from: FROM_EMAIL,
		to: email,
		subject: 'Odd Fellow Coffee - Payment Failed',
		html: `
			<h2>We had trouble processing your payment</h2>
			<p>Your recent subscription payment didn't go through. Please update your payment method to keep your subscription active.</p>
			<p><a href="${esc(updateUrl)}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">Update Payment</a></p>
			<p>If you have any questions, just reply to this email.</p>
			<p>- Odd Fellow Coffee Roasters</p>
		`
	});
}

export async function sendSubscriptionFulfilled(
	email: string,
	productName: string,
	variant: string | null,
	nextDeliveryDate: string
) {
	const variantText = variant ? ` (${esc(variant)})` : '';
	await transporter.sendMail({
		from: FROM_EMAIL,
		to: email,
		subject: 'Odd Fellow Coffee - Your Order Is On Its Way!',
		html: `
			<h2>Great news!</h2>
			<p>Your subscription order for <strong>${esc(productName)}${variantText}</strong> has been shipped!</p>
			<p>Your next delivery is scheduled for <strong>${esc(nextDeliveryDate)}</strong>.</p>
			<p>Thank you for being a subscriber!</p>
			<p>- Odd Fellow Coffee Roasters</p>
		`
	});
}
