import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { z } from "zod";
import {
  getAuthorizedSupabase,
  jsonError,
  parseJson,
  uuidSchema,
} from "@/lib/api/security";

const maintenanceApprovalSchema = z.object({
  action: z.enum(["notify_approved", "notify_rejected"]),
  ticket_id: uuidSchema,
  reason: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    const auth = await getAuthorizedSupabase(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const parsed = await parseJson(req, maintenanceApprovalSchema);
    if (parsed.error) return parsed.error;
    const { action, ticket_id, reason } = parsed.data;

    const { data: ticket } = await auth.supabase
      .from("maintenance_tickets")
      .select("*, vendors(name, email)")
      .eq("id", ticket_id)
      .single();

    if (!ticket || !ticket.vendors?.email) return NextResponse.json({ error: "Missing vendor email" }, { status: 404 });

    if (action === "notify_approved") {
      await sendEmail({
        to: ticket.vendors.email,
        subject: `✅ Quote Approved: ${ticket.title}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%); padding: 28px 32px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">✅ Quote Approved</h1>
              <p style="color: #a1a1aa; margin: 8px 0 0; font-size: 13px;">Your quote has been approved. You may proceed with the work.</p>
            </div>
            <div style="padding: 28px 32px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px; width: 140px;">Job Title</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px; font-weight: 600;">${ticket.title}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Approved Amount</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;"><span style="background: #f0fdf4; color: #16a34a; padding: 3px 10px; border-radius: 20px; font-size: 14px; font-weight: 600;">₹${ticket.actual_cost?.toLocaleString('en-IN') || '0'}</span></td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Status</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;"><span style="background: #f0fdf4; color: #16a34a; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">APPROVED — PROCEED</span></td></tr>
              </table>
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">Please begin the work at your earliest convenience. Once the job is completed, the property manager will verify and process your payment.</p>
              </div>
            </div>
            <div style="background: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">Powered by PropIQ — Intelligent Property Management</p>
            </div>
          </div>
        `
      });
    } else if (action === "notify_rejected") {
      await sendEmail({
        to: ticket.vendors.email,
        subject: `❌ Quote Not Approved: ${ticket.title}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%); padding: 28px 32px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">❌ Quote Not Approved</h1>
              <p style="color: #a1a1aa; margin: 8px 0 0; font-size: 13px;">Unfortunately, your quote was not approved for this job.</p>
            </div>
            <div style="padding: 28px 32px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px; width: 140px;">Job Title</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px; font-weight: 600;">${ticket.title}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Status</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;"><span style="background: #fef2f2; color: #dc2626; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">REJECTED</span></td></tr>
              </table>
              <div style="background: #fef2f2; border-radius: 8px; padding: 16px; border: 1px solid #fecaca;">
                <p style="margin: 0 0 4px; color: #991b1b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Reason</p>
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">${reason || 'Price too high / Need requote'}</p>
              </div>
              <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">You may be contacted to submit a revised quote. Thank you for your time.</p>
            </div>
            <div style="background: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">Powered by PropIQ — Intelligent Property Management</p>
            </div>
          </div>
        `
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
