// app/api/webhooks/new-lead/route.ts
import { NextResponse } from "next/server";
import { emailClient } from "../../../../lib/email";

export async function POST(req: Request) {
  try {
    const lead = await req.json();
    
    // Generate the exact HTML table from the n8n spec
    const htmlBody = `
      <h2>Hot Lead Alert</h2>
      <table border='1' cellpadding='8' style='border-collapse:collapse'>
        <tr><td><b>Name</b></td><td>${lead.full_name}</td></tr>
        <tr><td><b>Email</b></td><td>${lead.email || 'Not provided'}</td></tr>
        <tr><td><b>Phone</b></td><td>${lead.phone || 'Not provided'}</td></tr>
        <tr><td><b>Score</b></td><td>${lead.lead_score}/100</td></tr>
        <tr><td><b>Inquiry</b></td><td>${lead.inquiry_type}</td></tr>
        <tr><td><b>Budget</b></td><td>${lead.budget_min || '?'} – ${lead.budget_max || '?'}</td></tr>
        <tr><td><b>Area</b></td><td>${lead.preferred_area || 'Not specified'}</td></tr>
        <tr><td><b>Type</b></td><td>${lead.property_type || 'Not specified'}, ${lead.bedrooms || '?'} BHK</td></tr>
        <tr><td><b>Timeline</b></td><td>${lead.move_in_timeline || 'Not specified'}</td></tr>
        <tr><td><b>Source</b></td><td>${lead.source}</td></tr>
        <tr><td><b>Why Hot</b></td><td>${lead.score_reason || 'High AI Qualification Score'}</td></tr>
      </table>
      <p>This lead has been automatically moved to <b>Qualified</b> stage.</p>
    `;

    // Send the email to the agent using Resend/Nodemailer pattern
    await emailClient.send({
      to: process.env.AGENT_EMAIL || "agent@propiq.com",
      subject: `🔥 HOT LEAD — ${lead.full_name} | Score: ${lead.lead_score}/100`,
      html: htmlBody,
    });

    return NextResponse.json({ status: "received" });
    
  } catch (error) {
    console.error("Error processing new lead webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
