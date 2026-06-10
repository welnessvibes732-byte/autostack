import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { z } from "zod";
import {
  getAuthorizedSupabase,
  jsonError,
  parseJson,
  uuidSchema,
} from "@/lib/api/security";

const dealSignoffSchema = z.object({
  action: z.enum(["notify_signoff_request", "request_signoff", "notify_approved", "approved", "sent_back"]),
  lead_id: uuidSchema,
  feedback: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    const auth = await getAuthorizedSupabase(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const parsed = await parseJson(req, dealSignoffSchema);
    if (parsed.error) return parsed.error;
    const { action, lead_id, feedback } = parsed.data;

    const { data: lead } = await auth.supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const managerEmail = process.env.MANAGER_EMAIL || "niteshdevarla@gmail.com";
    const leadName = lead.full_name || "Unknown Lead";

    if (action === "notify_signoff_request" || action === "request_signoff") {
      await sendEmail({
        to: managerEmail,
        subject: `Deal Sign-off Required: ${leadName}`,
        html: `<p>A new deal for <strong>${leadName}</strong> requires your sign-off.</p><p>Please check the Approvals dashboard.</p>`
      });
    } else if (action === "notify_approved" || action === "approved") {
      await sendEmail({
        to: managerEmail, 
        subject: `Deal Approved: ${leadName}`,
        html: `<p>The deal for <strong>${leadName}</strong> has been approved by management. You may proceed with lease generation.</p>`
      });
    } else if (action === "sent_back") {
      await sendEmail({
        to: managerEmail,
        subject: `Deal Sent Back: ${leadName}`,
        html: `<p>The deal for <strong>${leadName}</strong> was sent back for revision.</p><p><strong>Feedback:</strong> ${feedback || "No feedback provided."}</p>`
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
