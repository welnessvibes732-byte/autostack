// frontend/src/app/api/webhooks/new-lead/route.ts
import { NextResponse } from "next/server";
import { sendEmail } from "../../../lib/email";

export async function POST(req: Request) {
  try {
    const lead = await req.json();
    
    // Generate the exact HTML table for the Hot Lead
    const htmlBody = `
      <h2>Hot Lead Alert</h2>
      <table border='1' cellpadding='8' style='border-collapse:collapse'>
        <tr><td><b>Name</b></td><td>${lead.full_name}</td></tr>
        <tr><td><b>Email</b></td><td>${lead.email || 'Not provided'}</td></tr>
        <tr><td><b>Phone</b></td><td>${lead.phone || 'Not provided'}</td></tr>
        <tr><td><b>Score</b></td><td>${lead.lead_score || 50}/100</td></tr>
        <tr><td><b>Inquiry</b></td><td>${lead.inquiry_type}</td></tr>
        <tr><td><b>Budget</b></td><td>${lead.budget_min || '?'} – ${lead.budget_max || '?'}</td></tr>
        <tr><td><b>Area</b></td><td>${lead.preferred_area || 'Not specified'}</td></tr>
        <tr><td><b>Source</b></td><td>Manual Entry</td></tr>
      </table>
      <p>This lead was created via the PropIQ app and is now in the pipeline.</p>
    `;

    // Send the email to the agent via Gmail
    const result = await sendEmail({
      to: process.env.AGENT_EMAIL || process.env.GMAIL_USER || "agent@propiq.com",
      subject: `🔥 HOT LEAD — ${lead.full_name} | Score: ${lead.lead_score || 50}/100`,
      html: htmlBody,
    });

    if (!result.success) {
      console.error("Failed to send email:", result.error);
      return NextResponse.json({ error: "Email failed to send" }, { status: 500 });
    }

    return NextResponse.json({ status: "success", message: "Email sent" });
    
  } catch (error) {
    console.error("Error processing new lead webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
