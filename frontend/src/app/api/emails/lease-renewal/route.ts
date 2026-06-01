import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { action, lease_id, tenant_email } = await req.json();

    const { data: lease } = await supabase
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
    } else if (action === "notify_renewed") {
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
