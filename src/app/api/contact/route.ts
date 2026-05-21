import { NextRequest } from 'next/server'
import { ok, err } from '@/lib/api'
import { Resend } from 'resend'
import { z } from 'zod'

const resend = new Resend(process.env.RESEND_API_KEY)

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(2000),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const { name, email, message } = parsed.data

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'noreply@yorkstores.com',
      to: 'admin@yorkstores.com',
      reply_to: email,
      subject: `Contact form message from ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#08080B;font-family:'Helvetica Neue',Arial,sans-serif">
        <div style="max-width:560px;margin:40px auto;padding:0 20px">
          <div style="margin-bottom:28px">
            <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.03em">York<span style="color:#FF6B85">stores</span></span>
          </div>
          <div style="background:#0F0F14;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px">
            <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px">New Contact Message</h1>
            <div style="background:#1D1D26;border-radius:10px;padding:20px;margin:20px 0">
              <p style="color:#52526A;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">From</p>
              <p style="color:#fff;font-weight:700;font-size:15px;margin:0 0 16px">${name}</p>
              <p style="color:#52526A;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">Email</p>
              <p style="color:#FF8FA3;font-size:15px;margin:0 0 16px">${email}</p>
              <p style="color:#52526A;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px">Message</p>
              <p style="color:#9898B0;font-size:15px;line-height:1.6;margin:0;white-space:pre-wrap">${message}</p>
            </div>
            <p style="color:#52526A;font-size:12px;margin:0">Reply directly to this email to respond to ${name}.</p>
          </div>
        </div>
        </body>
        </html>
      `,
    })
  } catch (e) {
    console.error('Contact email failed:', e)
    return err('Failed to send message. Please try again.')
  }

  return ok({ sent: true })
}