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

    // 4. Automatically Assign Vendor if none is set
    let assignedVendorId = ticket.vendor_id;
    
    if (!assignedVendorId && pincode) {
      console.log("Auto-assigning vendor for pincode:", pincode);
      // Fetch eligible vendors
      let query = supabase
        .from('vendors')
        .select('*')
        .eq('organization_id', ticket.organization_id)
        .eq('is_blacklisted', false)
        .contains('service_pincodes', [pincode]);

      if (ticket.category) {
         query = query.contains('category', [ticket.category]);
      }

      const { data: vendors } = await query;
      
      if (vendors && vendors.length > 0) {
        // Simple assignment: pick the one with highest score (we simplify the algorithm here)
        const scoredVendors = vendors.map(v => ({
          ...v,
          score: (v.is_preferred ? 50 : 0) + ((v.rating || 0) / 5.0 * 50) - ((v.avg_response_hours || 24) * 2)
        })).sort((a, b) => b.score - a.score);
        
        const winningVendor = scoredVendors[0];
        assignedVendorId = winningVendor.id;
        
        // Update the ticket
        await supabase
          .from('maintenance_tickets')
          .update({
            vendor_id: assignedVendorId,
            status: 'assigned',
            assigned_at: new Date().toISOString()
          })
          .eq('id', ticket.id);
          
        console.log("Successfully auto-assigned to vendor:", winningVendor.name);
      }
    }

    // 5. Send Email to Assigned Vendor
    if (assignedVendorId) {
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('id, name, email')
        .eq('id', assignedVendorId)
        .single();

      if (vendorData && vendorData.email) {
        const acceptLink = `http://localhost:3000/api/vendor/accept?ticket_id=${ticket.id}&vendor_id=${vendorData.id}`;
        const tenantName = tenant?.full_name || 'Not specified';
        const tenantPhone = tenant?.phone || 'Not provided';
        
        const vendorHtml = `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <p>Hi ${vendorData.name},</p>
            <p>A new maintenance ticket has been automatically assigned to you.</p>
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

        await sendEmail({
          to: vendorData.email,
          subject: `New Maintenance Job Assigned: ${ticket.category || 'Repair'}`,
          html: vendorHtml,
          text: `Hi ${vendorData.name}, you have a new job for ${ticket.category} at ${propertyAddress}.`,
        }).catch(e => console.error("Failed to send vendor notification:", e));
      }
    }

    return NextResponse.json({ status: "success", message: "Maintenance processed successfully" });
    
  } catch (error) {
    console.error("Error processing maintenance webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
