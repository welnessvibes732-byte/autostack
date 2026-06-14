import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, fullPhone, date, time, timezone, source } = body

    if (!name || !email || !fullPhone || !date || !time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Configure Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      },
    })

    // Email content
    const adminEmail = process.env.ADMIN_EMAIL || "founder@aethera.app" // Fallback if env not set
    
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 10px; padding: 20px;">
        <h2 style="color: #1a1a1a;">New N8N Automation Booking Request</h2>
        <p style="color: #555;">A user hit the paywall on the <strong>${source}</strong> feature and requested a demo call to unlock it.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr style="border-bottom: 1px solid #eaeaea;">
            <td style="padding: 10px 0; font-weight: bold; color: #333;">Name:</td>
            <td style="padding: 10px 0; color: #555;">${name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eaeaea;">
            <td style="padding: 10px 0; font-weight: bold; color: #333;">Email:</td>
            <td style="padding: 10px 0; color: #555;">${email}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eaeaea;">
            <td style="padding: 10px 0; font-weight: bold; color: #333;">Phone:</td>
            <td style="padding: 10px 0; color: #555;">${fullPhone}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eaeaea;">
            <td style="padding: 10px 0; font-weight: bold; color: #333;">Requested Date:</td>
            <td style="padding: 10px 0; color: #555;">${date}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eaeaea;">
            <td style="padding: 10px 0; font-weight: bold; color: #333;">Requested Time:</td>
            <td style="padding: 10px 0; color: #555;">${time} (${timezone})</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; color: #333;">Triggered From:</td>
            <td style="padding: 10px 0; color: #555;">${source}</td>
          </tr>
        </table>

        <div style="margin-top: 30px; padding: 15px; background: #f9f9f9; border-radius: 8px; text-align: center;">
          <a href="mailto:${email}?subject=Confirming our N8N Automation Demo" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reply to Lead</a>
        </div>
      </div>
    `

    await transporter.sendMail({
      from: `"Aethera System" <${process.env.SMTP_USER || "system@aethera.app"}>`,
      to: adminEmail,
      replyTo: email,
      subject: `🔥 New Lead: N8N Booking Request from ${name}`,
      html: htmlContent,
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("Booking email error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
