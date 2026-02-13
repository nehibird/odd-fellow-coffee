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

const SITE_URL = process.env.SITE_URL || 'https://oddfellowcoffee.com';

const BRAND = {
  red: '#B33935',
  dark: '#1a1a1a',
  lightBg: '#f9f6f2',
  border: '#e8e0d8',
  textMuted: '#6b6560',
  logoUrl: `${SITE_URL}/assets/logo-rounded.svg`,
  siteUrl: SITE_URL
};

function emailShell(content) {
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

<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

<tr>
<td style="background-color:${BRAND.dark};padding:28px 40px;text-align:center;">
<img src="${BRAND.logoUrl}" alt="Odd Fellow Coffee" width="60" height="60" style="border-radius:50%;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;">
<span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">ODD FELLOW COFFEE</span>
</td>
</tr>

<tr>
<td style="padding:36px 40px 24px;">
${content}
</td>
</tr>

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

</td></tr>
</table>
</body>
</html>`;
}

function btn(href, label, color = BRAND.dark) {
  return `<a href="${esc(href)}" style="display:inline-block;padding:14px 32px;background-color:${color};color:#ffffff;text-decoration:none;border-radius:30px;font-weight:600;font-size:14px;letter-spacing:0.5px;">${label}</a>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid ${BRAND.border};margin:24px 0;">`;
}

export async function sendOrderReady(email, name, orderId) {
  const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Ready for Pickup</p>
<h1 style="margin:0 0 8px;font-size:28px;color:${BRAND.dark};">Your order is ready, ${esc(name)}!</h1>
<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">Order <strong style="color:${BRAND.dark};">#${esc(String(orderId))}</strong> is packed and waiting for you.</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.lightBg};border-radius:8px;width:100%;">
<tr><td style="padding:20px;text-align:center;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Pickup Location</p>
<p style="margin:0 0 4px;font-size:16px;font-weight:700;color:${BRAND.dark};">Odd Fellow Coffee Roasters</p>
<p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Tonkawa, Oklahoma</p>
</td></tr>
</table>

<p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">Come by at your convenience during our business hours. We can't wait to see you!</p>

${divider()}

<p style="text-align:center;margin:0;">
${btn(BRAND.siteUrl + '/shop', 'Continue Shopping')}
</p>
`);

  await getTransporter().sendMail({
    from: `"Odd Fellow Coffee" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: `Order #${orderId} Ready for Pickup - Odd Fellow Coffee`,
    html
  });
}

export async function sendOrderShipped(email, name, orderId) {
  const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Shipment Update</p>
<h1 style="margin:0 0 8px;font-size:28px;color:${BRAND.dark};">Your order is on its way!</h1>
<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">Order <strong style="color:${BRAND.dark};">#${esc(String(orderId))}</strong> has been shipped, ${esc(name)}.</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid ${BRAND.border};border-radius:8px;width:100%;">
<tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Estimated Arrival</p>
<p style="margin:0 0 4px;font-size:18px;font-weight:700;color:${BRAND.dark};">3-5 business days</p>
<p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Freshly roasted and shipped via USPS. Keep an eye on your mailbox!</p>
</td></tr>
</table>

<p style="font-size:14px;color:${BRAND.textMuted};line-height:1.6;">Questions about your order? Just reply to this email and we'll help you out.</p>

${divider()}

<p style="text-align:center;margin:0;">
${btn(BRAND.siteUrl + '/shop', 'Continue Shopping')}
</p>
`);

  await getTransporter().sendMail({
    from: `"Odd Fellow Coffee" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: `Order #${orderId} Shipped - Odd Fellow Coffee`,
    html
  });
}

export async function sendSubscriptionFulfilled(email, productName, variant, nextDeliveryDate) {
  const variantText = variant ? ` (${esc(variant)})` : '';
  const html = emailShell(`
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">Shipment Update</p>
<h1 style="margin:0 0 8px;font-size:28px;color:${BRAND.dark};">Your coffee is on its way!</h1>
<p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">Your subscription order has been freshly roasted and shipped.</p>

<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background-color:${BRAND.lightBg};border-radius:8px;width:100%;">
<tr><td style="padding:20px;">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${BRAND.textMuted};">What's in the box</p>
<p style="margin:0;font-size:16px;font-weight:700;color:${BRAND.dark};">${esc(productName)}${variantText}</p>
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

  await getTransporter().sendMail({
    from: `"Odd Fellow Coffee" <${process.env.FROM_EMAIL}>`,
    to: email,
    subject: 'Your Coffee Has Shipped! - Odd Fellow Coffee',
    html
  });
}
