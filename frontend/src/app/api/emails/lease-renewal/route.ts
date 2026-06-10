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
        subject: `Lease Renewal Offer: Action Required`,
        html: `<p>Hi ${lease.tenants?.full_name},</p><p>Your lease is expiring soon. We would love to offer you a renewal. Please check your tenant portal to review the new terms.</p>`
      });
    } else if (action === "notify_renewed" || action === "mark_renewed") {
      await sendEmail({
        to: email,
        subject: `Lease Renewal Confirmed`,
        html: `<p>Hi ${lease.tenants?.full_name},</p><p>Your lease renewal has been countersigned and confirmed. You can view the fully executed document in your portal.</p>`
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
