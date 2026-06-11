import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'a-very-secure-jwt-secret-key-that-is-at-least-32-chars';

function signVendorPortalToken(ticketId: string, vendorId: string, action: string) {
  return jwt.sign(
    { ticket_id: ticketId, vendor_id: vendorId, action },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function main() {
  const envFile = fs.readFileSync('c:/Users/DELL/Documents/autostackk/frontend/.env.local', 'utf-8');
  let pass = "";
  for (const line of envFile.split('\n')) {
    if (line.startsWith('GMAIL_APP_PASSWORD=')) {
      pass = line.split('=')[1].trim().replace(/"/g, '').replace(/'/g, '');
    }
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "niteshdevarla@gmail.com",
      pass: pass
    }
  });

  const baseUrl = "http://localhost:3000";

  const jobs = [
    {ticket_id:"fd9bd42d-71f8-4ba8-a1be-3b21bafdded2",title:"Pipe Leak in Kitchen",vendor_id:"37b7842a-023c-47b6-9185-e789aec5ccc7",email:"niteshdevarla@gmail.com"},
    {ticket_id:"fa22bba4-049f-40d2-b58b-a88602f56a63",title:"Power Outage in Living Room",vendor_id:"b4e10858-f20a-4ad5-8bca-a340e2416140",email:"eliteaxis555@gmail.com"},
    {ticket_id:"bedc7b56-1f33-4150-a771-f8eef8355b95",title:"AC blowing warm air",vendor_id:"2cdc408a-50f9-4dd9-8c3a-63edcb648ed8",email:"neuronexai2@gmail.com"},
    {ticket_id:"6f6e83ef-a2bd-4717-87e2-d35146240c26",title:"Post-moveout deep clean",vendor_id:"3266ef02-783c-445f-9881-7dac329f517f",email:"welnessvibes732@gmail.com"},
    {ticket_id:"ef854dbc-b867-43a0-90aa-1c792e6a4e6f",title:"Fix broken window frame",vendor_id:"46def4b0-d54d-4276-bb0a-55063dbe5081",email:"gudmitai@gmail.com"}
  ];

  for (const job of jobs) {
    const token = signVendorPortalToken(job.ticket_id, job.vendor_id, 'accept');
    const acceptLink = `${baseUrl}/api/vendor/accept?ticket_id=${job.ticket_id}&vendor_id=${job.vendor_id}&token=${encodeURIComponent(token)}`;

    try {
      await transporter.sendMail({
        from: '"PropIQ Automation" <niteshdevarla@gmail.com>',
        to: job.email,
        subject: `New Work Order Available: ${job.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Maintenance Job</h2>
            <p><strong>Title:</strong> ${job.title}</p>
            <p><strong>Property:</strong> Amoreca Heights</p>
            <div style="margin-top: 20px;">
              <a href="${acceptLink}" style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Submit a Quote / Accept Job</a>
            </div>
          </div>
        `
      });
      console.log("Sent email to", job.email);
    } catch (e) {
      console.error("Failed to send to", job.email, e);
    }
  }
}

main().catch(console.error);
