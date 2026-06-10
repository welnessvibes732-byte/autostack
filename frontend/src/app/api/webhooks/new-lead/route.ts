import { NextResponse } from "next/server";
import { sendEmail } from "../../../../lib/email";
import { z } from "zod";
import {
  getAuthorizedSupabase,
  jsonError,
  parseJson,
  uuidSchema,
} from "@/lib/api/security";

const leadPayloadSchema = z.object({
  id: uuidSchema.optional(),
  full_name: z.string().trim().min(1).max(160),
  email: z.union([z.string().email(), z.literal("")]).optional(),
}).passthrough();

export async function POST(req: Request) {
  try {
    const auth = await getAuthorizedSupabase(req);
    if (!auth) return jsonError("Unauthorized", 401);
    
    const parsed = await parseJson(req, leadPayloadSchema);
    if (parsed.error) return parsed.error;
    const lead = parsed.data;
    
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

    const textBody = `Hi ${lead.full_name},

Thank you for your interest in our properties at PropIQ!

To help us find the perfect match for you, could you please reply to this email with a quick answer to the following questions?

1. What is your maximum monthly budget?
2. When are you looking to move in?
3. Do you have any pets? (If so, what kind?)
4. How many people will be living in the property?

Once you reply, our team will immediately curate a list of properties that match your criteria and get back to you.

Best regards,
The PropIQ Team`;

    // Send the email to the LEAD
    const result = await sendEmail({
      to: lead.email,
      subject: `Your Property Inquiry with PropIQ`,
      html: htmlBody,
      text: textBody,
    });

    if (!result.success) {
      console.error("Failed to send qualification email:", result.error);
      return NextResponse.json({ error: "Email failed to send" }, { status: 500 });
    }

    // Update Supabase to start the drip campaign
    if (lead.id) {
      const nextFollowUp = new Date();
      nextFollowUp.setDate(nextFollowUp.getDate() + 2); // Day 2 follow-up
      
      await auth.supabase.from("leads").update({
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
