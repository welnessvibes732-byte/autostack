import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { z } from "zod";
import {
  getAuthorizedSupabase,
  jsonError,
  parseJson,
  uuidSchema,
} from "@/lib/api/security";

const invoiceApprovalSchema = z.object({
  action: z.enum(["notify_approved", "notify_rejected"]),
  invoice_id: uuidSchema,
  reason: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    const auth = await getAuthorizedSupabase(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const parsed = await parseJson(req, invoiceApprovalSchema);
    if (parsed.error) return parsed.error;
    const { action, invoice_id, reason } = parsed.data;

    const { data: invoice } = await auth.supabase
      .from("invoices")
      .select("*, vendors(name, email)")
      .eq("id", invoice_id)
      .single();

    if (!invoice || !invoice.vendors?.email) return NextResponse.json({ error: "Missing vendor email" }, { status: 404 });

    if (action === "notify_approved") {
      await sendEmail({
        to: invoice.vendors.email,
        subject: `Invoice Approved: ${invoice.invoice_number}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%); padding: 28px 32px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">✅ Invoice Approved</h1>
              <p style="margin: 6px 0 0; font-size: 14px; color: #9ca3af;">Your invoice has been approved and queued for payment.</p>
            </div>
            <div style="padding: 28px 32px;">
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #6b7280; width: 140px;">Invoice #</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600;">${invoice.invoice_number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Amount</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600;">$${invoice.total_amount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Status</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #059669; font-weight: 600;">Approved — Payment Queued</td>
                  </tr>
                </table>
              </div>
              <p style="margin: 20px 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">Payment will be processed according to the standard payment schedule. No further action is required on your end.</p>
            </div>
            <div style="background: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">Powered by <strong style="color: #6b7280;">PropIQ</strong> — Intelligent Property Management</p>
            </div>
          </div>
        `
      });
    } else if (action === "notify_rejected") {
      await sendEmail({
        to: invoice.vendors.email,
        subject: `Invoice Rejected: ${invoice.invoice_number}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%); padding: 28px 32px;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">❌ Invoice Rejected</h1>
              <p style="margin: 6px 0 0; font-size: 14px; color: #9ca3af;">Your invoice requires attention — see details below.</p>
            </div>
            <div style="padding: 28px 32px;">
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #6b7280; width: 140px;">Invoice #</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600;">${invoice.invoice_number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Status</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #dc2626; font-weight: 600;">Rejected</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Reason</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #111827;">${reason || 'Please contact property management.'}</td>
                  </tr>
                </table>
              </div>
              <p style="margin: 20px 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">Please review the feedback above and submit a corrected invoice if applicable. Contact the property management team for further clarification.</p>
            </div>
            <div style="background: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">Powered by <strong style="color: #6b7280;">PropIQ</strong> — Intelligent Property Management</p>
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
