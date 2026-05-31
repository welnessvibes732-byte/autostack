// frontend/src/app/api/webhooks/new-lead/route.ts
import { NextResponse } from "next/server";
import { sendEmail } from "../../../../lib/email";
import { supabase } from "../../../../lib/supabase";

export async function POST(req: Request) {
  try {
    const lead = await req.json();
    
    // If there is no email provided, we cannot qualify them via email
    if (!lead.email) {
      console.log("No email provided for lead. Skipping AI qualification outreach.");
      return NextResponse.json({ status: "skipped", message: "No email provided" });
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <p>Hi ${lead.full_name},</p>
        <p>Thank you for your interest in our properties at PropIQ!</p>
        <p>To help us find the perfect match for you, could you please reply to this email with a quick answer to the following questions?</p>
        <ol>
          <li>What is your maximum monthly budget?</li>
          <li>When are you looking to move in?</li>
          <li>Do you have any pets? (If so, what kind?)</li>
          <li>How many people will be living in the property?</li>
        </ol>
        <p>Once you reply, our team will immediately curate a list of properties that match your criteria and get back to you.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>The PropIQ Team</strong></p>
      </div>
    `;

    // Send the email to the LEAD
    const result = await sendEmail({
      to: lead.email,
      subject: `Your Property Inquiry with PropIQ`,
      html: htmlBody,
    });

    if (!result.success) {
      console.error("Failed to send qualification email:", result.error);
      return NextResponse.json({ error: "Email failed to send" }, { status: 500 });
    }

    // Update Supabase to start the drip campaign
    if (lead.id) {
      const nextFollowUp = new Date();
      nextFollowUp.setDate(nextFollowUp.getDate() + 2); // Day 2 follow-up
      
      await supabase.from("leads").update({
        follow_up_day: 0,
        last_contact_at: new Date().toISOString(),
        next_follow_up_at: nextFollowUp.toISOString()
      }).eq("id", lead.id);
    }

    return NextResponse.json({ status: "success", message: "Qualification email sent" });
    
  } catch (error) {
    console.error("Error processing new lead webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
