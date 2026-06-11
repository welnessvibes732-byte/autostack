import nodemailer from "nodemailer";
import crypto from "crypto";
import fs from "fs";

function vendorPortalSecret() {
  const envFile = fs.readFileSync('c:/Users/DELL/Documents/autostackk/frontend/.env.local', 'utf-8');
  for (const line of envFile.split('\n')) {
    if (line.startsWith('VENDOR_PORTAL_SECRET=')) return line.split('=')[1].trim().replace(/['"]/g, '');
    if (line.startsWith('WEBHOOK_SECRET=')) return line.split('=')[1].trim().replace(/['"]/g, '');
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) return line.split('=')[1].trim().replace(/['"]/g, '');
  }
  return "default-secret";
}

function signVendorPortalToken(ticketId, vendorId, purpose) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `${purpose}:${ticketId}:${vendorId}:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", vendorPortalSecret())
    .update(payload)
    .digest("hex");
  return `${expiresAt}.${signature}`;
}

async function main() {
  const envFile = fs.readFileSync('c:/Users/DELL/Documents/autostackk/frontend/.env.local', 'utf-8');
  let pass = "";
  for (const line of envFile.split('\n')) {
    if (line.startsWith('GMAIL_APP_PASSWORD=')) {
      pass = line.split('=')[1].trim().replace(/['"]/g, '');
    }
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "niteshdevarla@gmail.com",
      pass: pass
    }
  });

  // REAL PRODUCTION DOMAIN - NOT LOCALHOST
  const baseUrl = "https://autostack-psi.vercel.app";

  const jobs = [
    {ticket_id:"fd9bd42d-71f8-4ba8-a1be-3b21bafdded2",title:"Pipe Leak in Kitchen",vendor_id:"37b7842a-023c-47b6-9185-e789aec5ccc7",email:"niteshdevarla@gmail.com",property:"Harbor Vault, New York",unit:"A-101",priority:"HIGH",category:"Plumbing",tenant:"John Martinez",description:"Kitchen sink pipe is leaking badly, water damage spreading to floor tiles."},
    {ticket_id:"fa22bba4-049f-40d2-b58b-a88602f56a63",title:"Power Outage in Living Room",vendor_id:"b4e10858-f20a-4ad5-8bca-a340e2416140",email:"eliteaxis555@gmail.com",property:"Amoreca Heights, Los Angeles",unit:"B-202",priority:"URGENT",category:"Electrical",tenant:"Sarah Williams",description:"Complete power failure in living room and bedroom. Breaker keeps tripping."},
    {ticket_id:"bedc7b56-1f33-4150-a771-f8eef8355b95",title:"AC blowing warm air",vendor_id:"2cdc408a-50f9-4dd9-8c3a-63edcb648ed8",email:"neuronexai2@gmail.com",property:"Miami Vice Condos, Florida",unit:"C-303",priority:"HIGH",category:"HVAC",tenant:"David Chen",description:"Central AC unit blowing warm air despite thermostat set to 72°F. Possible refrigerant leak."},
    {ticket_id:"6f6e83ef-a2bd-4717-87e2-d35146240c26",title:"Post-moveout deep clean",vendor_id:"3266ef02-783c-445f-9881-7dac329f517f",email:"welnessvibes732@gmail.com",property:"Sunset Ridge, San Francisco",unit:"D-404",priority:"MEDIUM",category:"Cleaning",tenant:"Emily Johnson",description:"Full apartment deep clean needed after tenant moveout. Carpets, kitchen, bathrooms."},
    {ticket_id:"ef854dbc-b867-43a0-90aa-1c792e6a4e6f",title:"Fix broken window frame",vendor_id:"46def4b0-d54d-4276-bb0a-55063dbe5081",email:"gudmitai@gmail.com",property:"Downtown Loft, Chicago",unit:"E-505",priority:"MEDIUM",category:"General",tenant:"Michael Brown",description:"Wooden window frame cracked and not sealing properly. Cold air leaking in."}
  ];

  for (const job of jobs) {
    const token = signVendorPortalToken(job.ticket_id, job.vendor_id, 'accept');
    const acceptLink = `${baseUrl}/api/vendor/accept?ticket_id=${job.ticket_id}&vendor_id=${job.vendor_id}&token=${encodeURIComponent(token)}`;

    try {
      await transporter.sendMail({
        from: '"PropIQ Automation" <niteshdevarla@gmail.com>',
        to: job.email,
        subject: `🔧 New Work Order: ${job.title} | ${job.property}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
            
            <div style="background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%); padding: 28px 32px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">🔧 New Maintenance Work Order</h1>
              <p style="color: #a1a1aa; margin: 8px 0 0; font-size: 13px;">You've been assigned a new job. Review the details below.</p>
            </div>

            <div style="padding: 28px 32px;">
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px; width: 140px;">Job Title</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px; font-weight: 600;">${job.title}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Property</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px;">${job.property}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Unit</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px;">${job.unit}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Priority</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                    <span style="background: ${job.priority === 'URGENT' ? '#fef2f2' : job.priority === 'HIGH' ? '#fffbeb' : '#f0fdf4'}; color: ${job.priority === 'URGENT' ? '#dc2626' : job.priority === 'HIGH' ? '#d97706' : '#16a34a'}; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">${job.priority}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Category</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px;">${job.category}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Tenant</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px;">${job.tenant}</td>
                </tr>
              </table>

              <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
                <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Description</p>
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">${job.description}</p>
              </div>

              <div style="text-align: center; margin-top: 28px;">
                <a href="${acceptLink}" style="display: inline-block; background: linear-gradient(135deg, #ec4899, #f97316); color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">Accept Job & Submit Quote →</a>
              </div>

              <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">This link expires in 7 days.</p>
            </div>

            <div style="background: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">Powered by PropIQ — Intelligent Property Management</p>
            </div>
          </div>
        `
      });
      console.log("✅ Sent email to", job.email);
    } catch (e) {
      console.error("❌ Failed to send to", job.email, e);
    }
  }
  
  console.log("\n🎉 All 5 emails sent with production links!");
}

main().catch(console.error);
