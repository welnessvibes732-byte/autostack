import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
};

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { ticket_id } = await req.json();

    if (!ticket_id) {
      return NextResponse.json({ error: 'ticket_id is required' }, { status: 400 });
    }

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

    // 3. Prepare payload for n8n
    const baseUrl = getBaseUrl();
    const payload = vendors.map(vendor => {
      // Handle property name (it could be direct on ticket if property_id was set, or via unit_id)
      const propName = ticket.property?.name || ticket.unit?.property?.name || 'Unknown Property';
      const propAddress = ticket.property?.address_line1 || ticket.unit?.property?.address_line1 || 'Unknown Address';
      const tenantName = ticket.tenant?.full_name || 'Not specified';
      const tenantPhone = ticket.tenant?.phone || 'Not specified';
      
      return {
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        vendor_email: vendor.email,
        ticket_id: ticket.id,
        ticket_title: ticket.title,
        ticket_description: ticket.description,
        property_name: propName,
        property_address: propAddress,
        unit_number: ticket.unit?.unit_number || 'Common Area',
        tenant_name: tenantName,
        tenant_phone: tenantPhone,
        priority: ticket.priority,
        accept_link: `${baseUrl}/api/vendor/accept?ticket_id=${ticket.id}&vendor_id=${vendor.id}`
      };
    });

    // 4. Return payload to frontend — the browser will call n8n directly
    // (Same pattern as leases page — browser calls localhost:5678 on user's machine)
    return NextResponse.json({ success: true, notifiedCount: vendors.length, payload });

  } catch (error: any) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
