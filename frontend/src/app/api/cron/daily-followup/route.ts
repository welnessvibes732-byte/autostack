// frontend/src/app/api/cron/daily-followup/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "../../../../lib/email";

// Ensure this route is evaluated dynamically (required for cron/webhooks)
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Check for a secret authorization header to prevent unauthorized cron triggering
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'dev-cron-secret'}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Initialize Supabase admin client to fetch all pending leads
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch leads that are 'New' or 'Contacted' and haven't been contacted in the last 24 hours
    // (For this prototype, we'll fetch 'New' leads missing a drip_sent flag)
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'New')
      .limit(50);

    if (error) throw error;
    if (!leads || leads.length === 0) {
      return NextResponse.json({ status: "success", message: "No leads require follow-up today." });
    }

    let emailsSent = 0;

    for (const lead of leads) {
      if (!lead.email) continue;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Hi ${lead.full_name.split(' ')[0]},</p>
          <p>I noticed you recently inquired about a ${lead.preferred_area ? lead.preferred_area : 'property'} property in our system.</p>
          <p>I'd love to schedule a quick 5-minute call to narrow down exactly what you're looking for, especially regarding your budget of ${lead.budget_max || 'your specified amount'}.</p>
          <p>Are you available sometime this week?</p>
          <p>Best regards,<br><strong>PropIQ Team</strong></p>
        </div>
      `;

      const result = await sendEmail({
        to: lead.email,
        subject: `Quick question regarding your property search...`,
        html: htmlBody,
      });

      if (result.success) {
        // Update the lead status so we don't email them again tomorrow
        await supabase
          .from('leads')
          .update({ status: 'Contacted' })
          .eq('id', lead.id);
        
        emailsSent++;
      }
    }

    return NextResponse.json({ 
      status: "success", 
      message: `Daily drip campaign completed. Sent ${emailsSent} emails.` 
    });

  } catch (error) {
    console.error("Error in daily followup cron:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
