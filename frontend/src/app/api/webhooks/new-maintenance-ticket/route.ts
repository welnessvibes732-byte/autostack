import { NextResponse } from "next/server";
import { sendEmail } from "../../../../lib/email";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Supabase webhook payload usually puts the row in `record`
    const payload = await req.json();
    const ticket = payload.record || payload; 
    
    if (!ticket.tenant_id) {
      console.log("No tenant associated with this ticket. Skipping email.");
      return NextResponse.json({ status: "skipped", message: "No tenant_id provided" });
    }

    // 1. Fetch tenant details to get the email and phone (if tenant_id exists)
    let tenant: any = null;
    if (ticket.tenant_id) {
      const { data, error } = await supabase
        .from('tenants')
        .select('full_name, email, phone')
        .eq('id', ticket.tenant_id)
        .single();
      if (!error && data) tenant = data;
    }

    // 2. Fetch property address for the vendor
    let propertyAddress = "Address Not Found";
    let unitNumber = "";
    let pincode = "";
    if (ticket.unit_id) {
      const { data: unitData } = await supabase
        .from('units')
        .select('unit_number, properties(address_line1, city, state, pincode)')
        .eq('id', ticket.unit_id)
        .single();
        
      if (unitData) {
        unitNumber = unitData.unit_number || "";
        const prop = Array.isArray(unitData.properties) ? unitData.properties[0] : unitData.properties;
        if (prop) {
          propertyAddress = `${prop.address_line1}, ${prop.city}, ${prop.state} ${prop.pincode}`;
          pincode = prop.pincode;
        }
      }
    }

    // 3. Send Email to Tenant (only if we have an email)
    if (tenant && tenant.email) {
      const trackingLink = `https://your-domain.com/tenant/tickets/${ticket.id}`;
      const tenantHtml = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <p>Hi ${tenant.full_name},</p>
          <p>We have successfully received your maintenance request regarding <strong>${ticket.category || 'your unit'}</strong>.</p>
          <p><strong>Description:</strong> ${ticket.description || 'N/A'}</p>
          <br/>
          <p>Our team is reviewing the issue and will assign a vendor shortly. You can track the status of your ticket using the link below:</p>
          <p><a href="${trackingLink}" style="display: inline-block; padding: 10px 15px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Track Ticket Status</a></p>
          <br/>
          <p>Best regards,</p>
          <p><strong>The Property Management Team</strong></p>
        </div>
      `;

      await sendEmail({
        to: tenant.email,
        subject: `Maintenance Request Received: ${ticket.category || 'Update'}`,
        html: tenantHtml,
        text: `Hi ${tenant.full_name}, we received your request for ${ticket.category}. You can track it here: ${trackingLink}`,
      }).catch(e => console.error("Failed to send tenant email:", e));
    } else {
      console.log("No tenant email found. Skipping tenant confirmation, proceeding to vendor assignment.");
    }

    // 4. Find Eligible Vendors to Broadcast To
    let assignedVendorId = ticket.vendor_id;
    
    if (!assignedVendorId) {
      console.log("Finding eligible vendors to broadcast ticket:", ticket.id);
      
      // Attempt 1: Match both pincode (if available) and category
      let query = supabase
        .from('vendors')
        .select('*')
        .eq('organization_id', ticket.organization_id)
        .eq('is_blacklisted', false);

      if (pincode) query = query.contains('service_pincodes', [pincode]);
      if (ticket.category) query = query.contains('category', [ticket.category]);

      let { data: vendors } = await query;
      
      // Fallback 1: Ignore pincode, just match category
      if ((!vendors || vendors.length === 0) && pincode) {
        console.log("No vendors found for pincode, trying just category...");
        let fallbackQuery = supabase
          .from('vendors')
          .select('*')
          .eq('organization_id', ticket.organization_id)
          .eq('is_blacklisted', false);
        if (ticket.category) fallbackQuery = fallbackQuery.contains('category', [ticket.category]);
        const res = await fallbackQuery;
        vendors = res.data;
      }

      // Fallback 2: Ignore category, just get ANY valid vendor
      if (!vendors || vendors.length === 0) {
        console.log("No vendors found for category either, picking ANY available vendor...");
        const res = await supabase
          .from('vendors')
          .select('*')
          .eq('organization_id', ticket.organization_id)
          .eq('is_blacklisted', false);
        vendors = res.data;
      }
      
      if (vendors && vendors.length > 0) {
        console.log(`Found ${vendors.length} vendors. Broadcasting to all of them.`);
        
        const appUrl = process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.startsWith('http') 
          ? process.env.NEXT_PUBLIC_APP_URL 
          : "https://autostack-psi.vercel.app";
          
        const tenantName = tenant?.full_name || 'Not specified';
        const tenantPhone = tenant?.phone || 'Not provided';
        
        // Send Email to all Eligible Vendors
        const emailPromises = vendors.map(vendorData => {
          if (!vendorData.email) return Promise.resolve();
          const acceptLink = `${appUrl}/api/vendor/accept?ticket_id=${ticket.id}&vendor_id=${vendorData.id}`;
          
          const vendorHtml = `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
              <p>Hi ${vendorData.name},</p>
              <p>A new maintenance job is available in your service area.</p>
              <h3>Job Details:</h3>
              <ul>
                <li><strong>Category:</strong> ${ticket.category || 'N/A'}</li>
                <li><strong>Description:</strong> ${ticket.description || 'N/A'}</li>
                <li><strong>Priority:</strong> ${ticket.priority || 'Normal'}</li>
              </ul>
              <h3>Location & Contact:</h3>
              <ul>
                <li><strong>Tenant Name:</strong> ${tenantName}</li>
                <li><strong>Tenant Phone:</strong> ${tenantPhone}</li>
                <li><strong>Property Address:</strong> ${propertyAddress} (Unit: ${unitNumber})</li>
              </ul>
              <br/>
              <p><a href="${acceptLink}" style="background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Submit a Quote / Accept Job</a></p>
              <p>Best regards,</p>
              <p><strong>The Property Management Team</strong></p>
            </div>
          `;

          return sendEmail({
            to: vendorData.email,
            subject: `New Maintenance Job Available: ${ticket.category || 'Repair'}`,
            html: vendorHtml,
            text: `Hi ${vendorData.name}, a new job for ${ticket.category} at ${propertyAddress} is available.`,
          }).catch(e => console.error("Failed to send vendor notification to", vendorData.email, e));
        });
        
        await Promise.all(emailPromises);
        console.log("Broadcasted emails to all eligible vendors.");
      } else {
        console.log("Absolutely no valid vendors found in the entire organization to broadcast to.");
      }
    }

    return NextResponse.json({ status: "success", message: "Maintenance processed successfully" });
    
  } catch (error) {
    console.error("Error processing maintenance webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
