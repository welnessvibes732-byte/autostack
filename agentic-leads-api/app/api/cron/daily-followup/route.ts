// app/api/cron/daily-followup/route.ts
import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { emailClient } from "../../../../lib/email";

export async function GET(req: Request) {
  // In Vercel, this endpoint is pinged by Vercel Cron securely
  // The n8n JSON used a schedule node (0 9 * * *)
  
  try {
    console.log("[CRON] Starting Daily Drip Campaign...");
    
    // 1. Fetch leads due for follow up
    const leads = await db.leads.findDueForFollowUp();
    
    for (const lead of leads) {
      let subject = "";
      let html = "";
      const budgetText = (lead.budget_min && lead.budget_max) 
        ? `₹${lead.budget_min.toLocaleString()} – ₹${lead.budget_max.toLocaleString()}` 
        : 'Not specified';
      
      // 2. Switch on follow_up_day (0 = Day 1, 1 = Day 3, 2 = Day 7, 3 = Day 14)
      switch (lead.follow_up_day) {
        case 0:
          subject = "Properties matching your requirements — PropIQ";
          html = `
            <p>Hi ${lead.full_name},</p>
            <p>Thank you for your inquiry. Based on what you shared, here is a quick summary of what we have found for you:</p>
            <table border='1' cellpadding='8' style='border-collapse:collapse;margin:16px 0'>
              <tr><td><b>Looking for</b></td><td>${lead.property_type || 'Property'}</td></tr>
              <tr><td><b>Budget</b></td><td>${budgetText}</td></tr>
              <tr><td><b>Preferred area</b></td><td>${lead.preferred_area || 'Flexible'}</td></tr>
            </table>
            <p>Our team is reviewing available listings. Best, PropIQ Team</p>
          `;
          break;
        case 1:
          subject = "Quick update on your property search — PropIQ";
          html = `
            <p>Hi ${lead.full_name},</p>
            <p>We wanted to check in on your property search in <b>${lead.preferred_area || 'your preferred area'}</b>.</p>
            <p>Are you still looking? Reply and let us know.</p>
            <p>Best, PropIQ Team</p>
          `;
          break;
        case 2:
          subject = "Still searching? We want to help — PropIQ";
          html = `<p>Hi ${lead.full_name}, it has been about a week. Has your budget of ${budgetText} changed? Let us know!</p>`;
          break;
        case 3:
          subject = "Closing your search file — PropIQ";
          html = `<p>Hi ${lead.full_name}, we haven't heard back, so we are closing your active search. Reply to reopen.</p>`;
          break;
      }

      if (subject && html) {
        // 3. Send Email
        await emailClient.send({ to: lead.email, subject, html });
        
        // 4. Update Postgres state
        await db.leads.updateFollowUpState(lead.id, lead.follow_up_day);
        
        // 5. Insert Audit Log
        await db.audit.logAction(lead.organization_id, "follow_up_sent", lead.id, { email: lead.email, day: lead.follow_up_day + 1 });
      }
    }

    return NextResponse.json({ status: "success", leadsProcessed: leads.length });
    
  } catch (error) {
    console.error("Error in daily cron:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
