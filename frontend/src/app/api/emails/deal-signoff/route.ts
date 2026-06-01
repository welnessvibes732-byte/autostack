import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { action, lead_id } = await req.json();

    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const managerEmail = process.env.MANAGER_EMAIL || "niteshdevarla@gmail.com";

    if (action === "notify_signoff_request") {
      await sendEmail({
        to: managerEmail,
        subject: `Deal Sign-off Required: ${lead.name}`,
        html: `<p>A new deal for <strong>${lead.name}</strong> requires your sign-off.</p><p>Please check the Approvals dashboard.</p>`
      });
    } else if (action === "notify_approved") {
      await sendEmail({
        to: managerEmail, 
        subject: `Deal Approved: ${lead.name}`,
        html: `<p>The deal for <strong>${lead.name}</strong> has been approved by management! You may proceed with lease generation.</p>`
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
