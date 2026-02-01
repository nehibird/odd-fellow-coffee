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

export async function sendOrderConfirmation(email: string, name: string, orderId: number, totalCents: number) {
	await transporter.sendMail({
		from: FROM_EMAIL,
		to: email,
		subject: `Odd Fellow Coffee - Order #${orderId} Confirmed`,
		html: `
			<h2>Thanks for your order, ${name}!</h2>
			<p>Order #${orderId}</p>
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
			<h2>Reservation Confirmed, ${name}!</h2>
			<p>Date: ${date}</p>
			<p>Time: ${timeSlot}</p>
			<p>See you then!</p>
			<p>- Odd Fellow Coffee Roasters</p>
		`
	});
}
