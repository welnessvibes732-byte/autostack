import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { z } from "zod";
import {
  getAuthorizedSupabase,
  jsonError,
  parseJson,
  uuidSchema,
} from "@/lib/api/security";

const leaseRenewalSchema = z.object({
  action: z.enum(["send_renewal_offer", "notify_renewed", "mark_renewed"]),
  lease_id: uuidSchema,
  tenant_email: z.string().email().optional(),
});

export async function POST(req: Request) {
  try {
    const auth = await getAuthorizedSupabase(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const parsed = await parseJson(req, leaseRenewalSchema);
    if (parsed.error) return parsed.error;
    const { action, lease_id, tenant_email } = parsed.data;

    const { data: lease } = await auth.supabase
      .from("leases")
      .select("*, tenants(full_name, email)")
      .eq("id", lease_id)
      .single();

    if (!lease) return NextResponse.json({ error: "Lease not found" }, { status: 404 });
    
    const email = tenant_email || lease.tenants?.email;
    if (!email) return NextResponse.json({ error: "Missing tenant email" }, { status: 404 });

    if (action === "send_renewal_offer") {
      await sendEmail({
        to: email,
        subject: `📋 Lease Renewal Offer — Action Required`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%); padding: 28px 32px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">📋 Lease Renewal Offer</h1>
              <p style="color: #a1a1aa; margin: 8px 0 0; font-size: 13px;">Your lease is expiring soon. We'd love to renew it with you.</p>
            </div>
            <div style="padding: 28px 32px;">
              <p style="color: #111827; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Hi <strong>${lease.tenants?.full_name || 'Tenant'}</strong>,</p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px; width: 140px;">Expiry Date</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px; font-weight: 600;">${lease.expiry_date ? new Date(lease.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Current Rent</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px; font-weight: 600;">₹${lease.rent_amount?.toLocaleString('en-IN') || '0'}/mo</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Status</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;"><span style="background: #fffbeb; color: #d97706; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">RENEWAL PENDING</span></td></tr>
              </table>
              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">We would love to offer you a renewal on your current lease. Please review the new terms at your earliest convenience and contact the property management team to confirm.</p>
              </div>
            </div>
            <div style="background: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">Powered by PropIQ — Intelligent Property Management</p>
            </div>
          </div>
        `
      });
    } else if (action === "notify_renewed" || action === "mark_renewed") {
      await sendEmail({
        to: email,
        subject: `✅ Lease Renewal Confirmed`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%); padding: 28px 32px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">✅ Lease Renewed Successfully</h1>
              <p style="color: #a1a1aa; margin: 8px 0 0; font-size: 13px;">Great news! Your lease has been renewed and confirmed.</p>
            </div>
            <div style="padding: 28px 32px;">
              <p style="color: #111827; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">Hi <strong>${lease.tenants?.full_name || 'Tenant'}</strong>,</p>
              <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; border: 1px solid #bbf7d0;">
                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">Your lease renewal has been countersigned and confirmed. You can view the fully executed document in your tenant portal. Thank you for continuing to be a valued tenant!</p>
              </div>
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
