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
