import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lead_id, organization_id } = body;

    if (!lead_id) return NextResponse.json({ error: "lead_id required" }, { status: 400 });

    const { data: lead } = await supabase.from("leads").select("*").eq("id", lead_id).single();
    if (!lead || !lead.email) return NextResponse.json({ error: "Lead not found or missing email" }, { status: 404 });

    const tourLink = "https://calendly.com/your-demo-link";
    
    await sendEmail({
      to: lead.email,
      subject: "You're Pre-Qualified! Schedule a Tour",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #000; color: #fff; padding: 20px; text-align: center;">
            <h2>Congratulations, ${lead.name}!</h2>
          </div>
          <div style="padding: 20px; color: #333;">
            <p>Your application has been pre-qualified for the property.</p>
            <p>We'd love to show you around. Please schedule a tour at your earliest convenience using the link below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${tourLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Schedule Your Tour</a>
            </div>
            <p>If you have any questions, feel free to reply to this email.</p>
          </div>
        </div>
      `
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
