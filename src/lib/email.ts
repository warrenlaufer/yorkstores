import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'noreply@yorkstores.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#08080B;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:560px;margin:40px auto;padding:0 20px">
  <div style="margin-bottom:28px">
    <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.03em">York<span style="color:#FF6B85">stores</span></span>
  </div>
  <div style="background:#0F0F14;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px">
    ${content}
  </div>
  <p style="color:#52526A;font-size:12px;margin-top:24px;text-align:center">
    Yorkstores · Mystery Box Platform<br>
    You're receiving this because you have an account at yorkstores.com
  </p>
</div>
</body>
</html>`
}

export async function sendWelcomeEmail(to: string, name: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to Yorkstores 📦',
    html: baseTemplate(`
      <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px">Welcome, ${name}!</h1>
      <p style="color:#9898B0;font-size:15px;line-height:1.6;margin:0 0 24px">
        Your account is ready. Open mystery boxes, choose delivery or sell back within 5 minutes.
      </p>
      <a href="${APP_URL}" style="display:inline-block;background:#FF6B85;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:15px">
        Start Shopping →
      </a>
    `),
  })
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Yorkstores password',
    html: baseTemplate(`
      <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px">Reset your password</h1>
      <p style="color:#9898B0;font-size:15px;line-height:1.6;margin:0 0 8px">
        Hi ${name}, someone requested a password reset for your account.
        If that wasn't you, ignore this email.
      </p>
      <p style="color:#9898B0;font-size:13px;margin:0 0 24px">This link expires in 1 hour.</p>
      <a href="${url}" style="display:inline-block;background:#FF6B85;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:15px">
        Reset Password →
      </a>
    `),
  })
}

export async function sendOrderConfirmationEmail(to: string, buyerName: string, order: {
  itemName: string
  dropName: string
  price: number
  address: string
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your Yorkstores order is confirmed — ${order.itemName}`,
    html: baseTemplate(`
      <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px">Order confirmed 📦</h1>
      <p style="color:#9898B0;font-size:15px;line-height:1.6;margin:0 0 20px">
        Hi ${buyerName}! We're preparing your item for shipment.
      </p>
      <div style="background:#1D1D26;border-radius:10px;padding:20px;margin-bottom:24px">
        <p style="color:#52526A;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">Item</p>
        <p style="color:#fff;font-weight:700;font-size:16px;margin:0 0 16px">${order.itemName}</p>
        <p style="color:#52526A;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">From drop</p>
        <p style="color:#9898B0;font-size:14px;margin:0 0 16px">${order.dropName}</p>
        <p style="color:#52526A;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">Shipping to</p>
        <p style="color:#9898B0;font-size:14px;margin:0 0 16px;white-space:pre-line">${order.address}</p>
        <p style="color:#52526A;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">Value</p>
        <p style="color:#F5C842;font-weight:700;font-family:monospace;font-size:16px;margin:0">$${order.price.toFixed(2)}</p>
      </div>
      <p style="color:#9898B0;font-size:13px;margin:0">We'll email you again with tracking info once it ships.</p>
    `),
  })
}

export async function sendShippingNotificationEmail(to: string, buyerName: string, details: {
  itemName: string
  trackingNumber: string
  carrier?: string
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your ${details.itemName} has shipped! 🚚`,
    html: baseTemplate(`
      <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px">It's on its way!</h1>
      <p style="color:#9898B0;font-size:15px;line-height:1.6;margin:0 0 20px">
        Hi ${buyerName}, your <strong style="color:#fff">${details.itemName}</strong> has been shipped.
      </p>
      <div style="background:#1D1D26;border-radius:10px;padding:20px;margin-bottom:24px">
        <p style="color:#52526A;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">Tracking number</p>
        <p style="color:#3DD68C;font-weight:700;font-family:monospace;font-size:18px;margin:0">${details.trackingNumber}</p>
        ${details.carrier ? `<p style="color:#52526A;font-size:13px;margin:8px 0 0">${details.carrier}</p>` : ''}
      </div>
      <p style="color:#9898B0;font-size:13px">Use your tracking number on the carrier's website to follow your delivery.</p>
    `),
  })
}

export async function sendSellBackConfirmationEmail(to: string, buyerName: string, details: {
  itemName: string
  refundAmount: number
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Sell-back confirmed — $${details.refundAmount.toFixed(2)} credited to your account`,
    html: baseTemplate(`
      <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px">Sell-back processed 💸</h1>
      <p style="color:#9898B0;font-size:15px;line-height:1.6;margin:0 0 20px">
        Hi ${buyerName}, your sell-back for <strong style="color:#fff">${details.itemName}</strong> has been processed.
      </p>
      <div style="background:#1D1D26;border-radius:10px;padding:20px;margin-bottom:24px">
        <p style="color:#52526A;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">Amount credited to your account</p>
        <p style="color:#3DD68C;font-weight:700;font-family:monospace;font-size:24px;margin:0">+$${details.refundAmount.toFixed(2)}</p>
      </div>
      <a href="${APP_URL}" style="display:inline-block;background:#FF6B85;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:15px">
        Open another box →
      </a>
    `),
  })
}

export async function sendNewOrderNotificationEmail(to: string, ownerName: string, order: {
  itemName: string
  buyerName: string
  address: string
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `New order to fulfil — ${order.itemName}`,
    html: baseTemplate(`
      <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px">New order received 🎉</h1>
      <p style="color:#9898B0;font-size:15px;line-height:1.6;margin:0 0 20px">
        Hi ${ownerName}, a buyer has chosen delivery for one of your items.
      </p>
      <div style="background:#1D1D26;border-radius:10px;padding:20px;margin-bottom:24px">
        <p style="color:#52526A;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">Item to ship</p>
        <p style="color:#fff;font-weight:700;font-size:16px;margin:0 0 16px">${order.itemName}</p>
        <p style="color:#52526A;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">Buyer</p>
        <p style="color:#9898B0;font-size:14px;margin:0 0 16px">${order.buyerName}</p>
        <p style="color:#52526A;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">Ship to</p>
        <p style="color:#9898B0;font-size:14px;margin:0;white-space:pre-line">${order.address}</p>
      </div>
      <a href="${APP_URL}/dashboard/fulfilment" style="display:inline-block;background:#FF6B85;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:15px">
        Go to Fulfilment →
      </a>
    `),
  })
}
