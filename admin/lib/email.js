import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

function esc(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendOrderReady(email, name, orderId) {
  await getTransporter().sendMail({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: `Odd Fellow Coffee - Order #${orderId} Ready for Pickup!`,
    html: `
      <h2>Your order is ready, ${esc(name)}!</h2>
      <p>Order #${esc(String(orderId))} is packed and waiting for you.</p>
      <p>Come pick it up at your convenience during our business hours.</p>
      <p>- Odd Fellow Coffee Roasters</p>
    `
  });
}

export async function sendOrderShipped(email, name, orderId) {
  await getTransporter().sendMail({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: `Odd Fellow Coffee - Order #${orderId} Shipped!`,
    html: `
      <h2>Your order is on its way, ${esc(name)}!</h2>
      <p>Order #${esc(String(orderId))} has been shipped.</p>
      <p>Keep an eye on your mailbox — it should arrive soon!</p>
      <p>- Odd Fellow Coffee Roasters</p>
    `
  });
}

export async function sendSubscriptionFulfilled(email, productName, variant, nextDeliveryDate) {
  const variantText = variant ? ` (${esc(variant)})` : '';
  await getTransporter().sendMail({
    from: process.env.FROM_EMAIL,
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
