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

    // 1. Fetch tenant details to get the email and phone
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('full_name, email, phone')
      .eq('id', ticket.tenant_id)
      .single();

    if (tenantError || !tenant || !tenant.email) {
      console.log("Tenant not found or no email provided. Skipping email.");
      return NextResponse.json({ status: "skipped", message: "Tenant email not found" });
    }

    // 2. Fetch property address for the vendor
    let propertyAddress = "Address Not Found";
    let unitNumber = "";
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
        }
      }
    }

    // 3. Send Email to Tenant
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

    const tenantResult = await sendEmail({
      to: tenant.email,
      subject: `Maintenance Request Received: ${ticket.category || 'Update'}`,
      html: tenantHtml,
      text: `Hi ${tenant.full_name}, we received your request for ${ticket.category}. You can track it here: ${trackingLink}`,
    });

    if (!tenantResult.success) {
      console.error("Failed to send tenant confirmation email:", tenantResult.error);
    }

    // 4. Send Email to Vendor (if assigned)
    if (ticket.vendor_id) {
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('name, email')
        .eq('id', ticket.vendor_id)
        .single();

      if (vendorData && vendorData.email) {
        const vendorHtml = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <p>Hi ${vendorData.name},</p>
            <p>A new maintenance ticket has been assigned to you.</p>
            <h3>Job Details:</h3>
            <ul>
              <li><strong>Category:</strong> ${ticket.category || 'N/A'}</li>
              <li><strong>Description:</strong> ${ticket.description || 'N/A'}</li>
              <li><strong>Priority:</strong> ${ticket.priority || 'Normal'}</li>
            </ul>
            <h3>Location & Contact:</h3>
            <ul>
              <li><strong>Tenant Name:</strong> ${tenant.full_name}</li>
              <li><strong>Tenant Phone:</strong> ${tenant.phone || 'Not provided'}</li>
              <li><strong>Property Address:</strong> ${propertyAddress} (Unit: ${unitNumber})</li>
            </ul>
            <br/>
            <p>Please contact the tenant to schedule the repair.</p>
            <p>Best regards,</p>
            <p><strong>The Property Management Team</strong></p>
          </div>
        `;

        const vendorResult = await sendEmail({
          to: vendorData.email,
          subject: `New Maintenance Job Assigned: ${ticket.category || 'Repair'}`,
          html: vendorHtml,
          text: `Hi ${vendorData.name}, you have a new job for ${ticket.category} at ${propertyAddress}. Tenant: ${tenant.full_name} (${tenant.phone}).`,
        });

        if (!vendorResult.success) {
          console.error("Failed to send vendor notification email:", vendorResult.error);
        }
      }
    }

    return NextResponse.json({ status: "success", message: "Maintenance emails processed successfully" });
    
  } catch (error) {
    console.error("Error processing maintenance webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
