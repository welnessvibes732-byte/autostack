import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { action, ticket_id, reason } = await req.json();

    const { data: ticket } = await supabase
      .from("maintenance_tickets")
      .select("*, vendors(name, email)")
      .eq("id", ticket_id)
      .single();

    if (!ticket || !ticket.vendors?.email) return NextResponse.json({ error: "Missing vendor email" }, { status: 404 });

    if (action === "notify_approved") {
      await sendEmail({
        to: ticket.vendors.email,
        subject: `Quote Approved: ${ticket.title}`,
        html: `<p>Your quote of $${ticket.actual_cost} for ticket <strong>${ticket.title}</strong> has been approved. You may proceed with the work.</p>`
      });
    } else if (action === "notify_rejected") {
      await sendEmail({
        to: ticket.vendors.email,
        subject: `Quote Rejected: ${ticket.title}`,
        html: `
          <p>Your quote for <strong>${ticket.title}</strong> was not approved.</p>
          <p><strong>Reason:</strong> ${reason || 'Price too high / Need requote'}</p>
        `
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
