import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { action, invoice_id, reason } = await req.json();

    const { data: invoice } = await supabase
      .from("invoices")
      .select("*, vendors(name, email)")
      .eq("id", invoice_id)
      .single();

    if (!invoice || !invoice.vendors?.email) return NextResponse.json({ error: "Missing vendor email" }, { status: 404 });

    if (action === "notify_approved") {
      await sendEmail({
        to: invoice.vendors.email,
        subject: `Invoice Approved: ${invoice.invoice_number}`,
        html: `<p>Your invoice <strong>${invoice.invoice_number}</strong> for $${invoice.total_amount} has been approved and is queued for payment.</p>`
      });
    } else if (action === "notify_rejected") {
      await sendEmail({
        to: invoice.vendors.email,
        subject: `Invoice Rejected: ${invoice.invoice_number}`,
        html: `
          <p>Your invoice <strong>${invoice.invoice_number}</strong> has been flagged/rejected.</p>
          <p><strong>Reason:</strong> ${reason || 'Please contact property management.'}</p>
        `
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
