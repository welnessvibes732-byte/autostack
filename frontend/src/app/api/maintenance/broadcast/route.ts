import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getBaseUrl,
  parseJson,
  requireUserSupabase,
  signVendorPortalToken,
  uuidSchema,
} from '@/lib/api/security';

const broadcastSchema = z.object({
  ticket_id: uuidSchema,
});

export async function POST(req: Request) {
  try {
    const auth = await requireUserSupabase(req);
    if (auth.error) return auth.error;

    const parsed = await parseJson(req, broadcastSchema);
    if (parsed.error) return parsed.error;
    const { ticket_id } = parsed.data;
    const { supabase } = auth;

    // 1. Fetch ticket details to get category and organization_id
    const { data: ticket, error: ticketErr } = await supabase
      .from('maintenance_tickets')
      .select('*, property:properties(name, address_line1), unit:units(unit_number, property:properties(name, address_line1)), tenant:tenants(full_name, phone)')
      .eq('id', ticket_id)
      .single();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: 'Ticket not found or access denied' }, { status: 404 });
    }

    // 2. Fetch vendors in the same organization matching the category
    let query = supabase
      .from('vendors')
      .select('id, name, email, phone')
      .eq('organization_id', ticket.organization_id);

    if (ticket.category) {
      // Vendors table has category TEXT[]. Contains uses array syntax.
      query = query.contains('category', [ticket.category]);
    }

    const { data: vendors, error: vendorErr } = await query;

    if (vendorErr) {
      return NextResponse.json({ error: vendorErr.message }, { status: 500 });
    }

    if (!vendors || vendors.length === 0) {
      return NextResponse.json({ success: true, notifiedCount: 0, message: 'No matching vendors found.' });
    }

    // 3. Send emails natively via Nodemailer
    const baseUrl = getBaseUrl();
    const { sendEmail } = await import('@/lib/email');
    
    let notifiedCount = 0;

    for (const vendor of vendors) {
      const propName = ticket.property?.name || ticket.unit?.property?.name || 'Unknown Property';
      const propAddress = ticket.property?.address_line1 || ticket.unit?.property?.address_line1 || 'Unknown Address';
      const tenantName = ticket.tenant?.full_name || 'Not specified';
      const tenantPhone = ticket.tenant?.phone || 'Not specified';
      const token = signVendorPortalToken(ticket.id, vendor.id, 'accept');
      const acceptLink = `${baseUrl}/api/vendor/accept?ticket_id=${ticket.id}&vendor_id=${vendor.id}&token=${encodeURIComponent(token)}`;

      if (vendor.email) {
        await sendEmail({
          to: vendor.email,
          subject: `🔧 New Work Order: ${ticket.title} | ${propName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
              <div style="background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%); padding: 28px 32px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">🔧 New Maintenance Work Order</h1>
                <p style="color: #a1a1aa; margin: 8px 0 0; font-size: 13px;">You've been assigned a new job. Review the details below.</p>
              </div>
              <div style="padding: 28px 32px;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px; width: 140px;">Job Title</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px; font-weight: 600;">${ticket.title}</td></tr>
                  <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Property</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px;">${propName}</td></tr>
                  <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Unit</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px;">${ticket.unit?.unit_number || 'Common Area'}</td></tr>
                  <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Address</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px;">${propAddress}</td></tr>
                  <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Priority</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;"><span style="background: ${ticket.priority === 'urgent' ? '#fef2f2' : ticket.priority === 'high' ? '#fffbeb' : '#f0fdf4'}; color: ${ticket.priority === 'urgent' ? '#dc2626' : ticket.priority === 'high' ? '#d97706' : '#16a34a'}; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${ticket.priority}</span></td></tr>
                  <tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 13px;">Tenant</td><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px;">${tenantName} (${tenantPhone})</td></tr>
                </table>
                ${ticket.description ? `<div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #e5e7eb;"><p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Description</p><p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">${ticket.description}</p></div>` : ''}
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
        notifiedCount++;
      }
    }

    // 4. Return success to frontend
    return NextResponse.json({ success: true, notifiedCount, message: 'Broadcasted to vendors successfully.' });

  } catch (error: any) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
