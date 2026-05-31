import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "../../../../lib/email";

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch all leads that are in 'new' stage, have an email, and need a follow-up today or earlier.
    const now = new Date().toISOString();
    const { data: leads, error } = await supabase
      .from("leads")
      .select("*")
      .eq("stage", "new")
      .not("email", "is", null)
      .lte("next_follow_up_at", now);

    if (error) throw error;
    if (!leads || leads.length === 0) {
      return NextResponse.json({ status: "success", message: "No follow-ups needed today" });
    }

    console.log(`Found ${leads.length} leads requiring follow-up.`);

    for (const lead of leads) {
      let nextDay = 0;
      let subject = "";
      let htmlBody = "";
      let newStage = "new";

      const currentDay = lead.follow_up_day || 0;

      // Follow-up Sequence Logic
      if (currentDay === 0) {
        // Send Day 2 Email
        subject = `Checking in on your property search, ${lead.full_name.split(' ')[0]}`;
        htmlBody = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <p>Hi ${lead.full_name},</p>
            <p>I'm just bubbling this up to the top of your inbox. We have some great new properties that just hit the market that might match your criteria.</p>
            <p>If you could just reply with your maximum budget and move-in timeline, I can send them over!</p>
            <br/>
            <p>Best,<br/>The PropIQ Team</p>
          </div>
        `;
        nextDay = 2;
      } else if (currentDay === 2) {
        // Send Day 5 Email
        subject = `A quick guide for your move`;
        htmlBody = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <p>Hi ${lead.full_name},</p>
            <p>Finding the right place can be stressful. We've put together a quick checklist for what to look out for when renting in this area.</p>
            <p>Are you still actively looking for a place? Let me know and I'll send over some tailored options.</p>
            <br/>
            <p>Best,<br/>The PropIQ Team</p>
          </div>
        `;
        nextDay = 5;
      } else if (currentDay === 5) {
        // Send Day 10 Breakup Email
        subject = `Closing your file?`;
        htmlBody = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <p>Hi ${lead.full_name},</p>
            <p>I haven't heard back from you, so I'm assuming you've either found a place or put your search on hold.</p>
            <p>I'll stop reaching out for now, but if you do need help in the future, just reply to this email!</p>
            <br/>
            <p>Best,<br/>The PropIQ Team</p>
          </div>
        `;
        nextDay = 10;
        newStage = "closed_lost"; // They didn't reply to the whole sequence
      } else {
        // If they somehow got here but don't match, or reached the end, just close them.
        newStage = "closed_lost";
      }

      if (subject && htmlBody) {
        const result = await sendEmail({
          to: lead.email,
          subject: subject,
          html: htmlBody
        });

        if (!result.success) {
          console.error(`Failed to send follow-up to ${lead.email}`);
          continue;
        }

        // Update Supabase
        const nextFollowUp = new Date();
        if (nextDay === 2) nextFollowUp.setDate(nextFollowUp.getDate() + 3); // next is day 5
        if (nextDay === 5) nextFollowUp.setDate(nextFollowUp.getDate() + 5); // next is day 10

        const newNotes = (lead.notes || "") + `\n[Auto-Followup Day ${nextDay} sent]`;

        await supabase.from("leads").update({
          follow_up_day: nextDay,
          last_contact_at: new Date().toISOString(),
          next_follow_up_at: newStage === "closed_lost" ? null : nextFollowUp.toISOString(),
          stage: newStage,
          notes: newNotes
        }).eq("id", lead.id);
        
        console.log(`Sent Day ${nextDay} follow-up to ${lead.email}`);
      } else if (newStage === "closed_lost") {
        await supabase.from("leads").update({
          stage: "closed_lost",
          next_follow_up_at: null,
          notes: (lead.notes || "") + `\n[Auto-closed due to no response]`
        }).eq("id", lead.id);
      }
    }

    return NextResponse.json({ status: "success", message: `Processed ${leads.length} follow-ups` });

  } catch (error: any) {
    console.error("Cron Error (Daily Follow-ups):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
