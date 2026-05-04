import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We need the service role key to bypass RLS since the vendor is not authenticated
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticket_id = searchParams.get('ticket_id');
  const vendor_id = searchParams.get('vendor_id');

  if (!ticket_id || !vendor_id) {
    return new NextResponse('Missing ticket_id or vendor_id', { status: 400 });
  }

  try {
    // 1. Fetch ticket with details
    const { data: ticket, error: fetchErr } = await supabase
      .from('maintenance_tickets')
      .select(`
        status, vendor_id, title, description,
        unit:units(unit_number, property:properties(name, address_line1, address_line2, city, state, pincode)),
        tenant:tenants(full_name, phone)
      `)
      .eq('id', ticket_id)
      .single();

    if (fetchErr || !ticket) {
      console.error(fetchErr);
      return new NextResponse(
        generateHtml('Error', 'Ticket not found', 'The ticket you are trying to access does not exist or access was denied.', '#ef4444'),
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // 2. Check if already claimed
    if (ticket.vendor_id) {
      if (ticket.vendor_id === vendor_id) {
        return new NextResponse(
          generateHtml('Assigned', 'You are already assigned!', 'You have already claimed this ticket.', '#3b82f6'),
          { status: 200, headers: { 'Content-Type': 'text/html' } }
        );
      } else {
        return new NextResponse(
          generateHtml('Too Late', 'Ticket Already Claimed', 'Sorry, another vendor has already accepted this job.', '#f59e0b'),
          { status: 200, headers: { 'Content-Type': 'text/html' } }
        );
      }
    }

    if (ticket.status !== 'open') {
      return new NextResponse(
        generateHtml('Closed', 'Ticket Not Available', 'This ticket is no longer open for assignment.', '#f59e0b'),
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // 3. Assign to this vendor
    const { error: updateErr } = await supabase
      .from('maintenance_tickets')
      .update({
        vendor_id: vendor_id,
        status: 'in_progress',
        assigned_at: new Date().toISOString()
      })
      .eq('id', ticket_id)
      .is('vendor_id', null); // Optimistic locking

    if (updateErr) {
      console.error(updateErr);
      // Fallback message if RLS blocked it (which happens if SUPABASE_SERVICE_ROLE_KEY is missing)
      if (updateErr.code === '42501' || updateErr.message.includes('row-level security')) {
         return new NextResponse(
           generateHtml('Configuration Error', 'System Error', 'Database permission denied. The server needs SUPABASE_SERVICE_ROLE_KEY to complete this action.', '#ef4444'),
           { status: 500, headers: { 'Content-Type': 'text/html' } }
         );
      }
      throw updateErr;
    }

    // Prepare details HTML for the success screen
    const t = ticket as any;
    const propName = t.unit?.property?.name || 'Unknown Property';
    const address1 = t.unit?.property?.address_line1 || '';
    const address2 = t.unit?.property?.address_line2 || '';
    const city = t.unit?.property?.city || '';
    const pincode = t.unit?.property?.pincode || '';
    const fullAddress = [address1, address2, city, pincode].filter(Boolean).join(', ');
    
    const unitNumber = t.unit?.unit_number ? `Unit: ${t.unit.unit_number}` : '';
    const tenantName = t.tenant?.full_name ? `Tenant: ${t.tenant.full_name}` : '';
    const tenantPhone = t.tenant?.phone ? `Phone: ${t.tenant.phone}` : '';

    const detailsHtml = `
      <div style="text-align: left; background: #111; padding: 20px; border-radius: 12px; margin-top: 25px; border: 1px solid #222;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #fff; border-bottom: 1px solid #333; padding-bottom: 8px;">Job Details</h3>
        <p style="margin: 0 0 8px 0; color: #ccc; font-size: 14px;"><b>Issue:</b> ${ticket.description || ticket.title}</p>
        <p style="margin: 0 0 8px 0; color: #ccc; font-size: 14px;"><b>Property:</b> ${propName}</p>
        ${fullAddress ? `<p style="margin: 0 0 8px 0; color: #ccc; font-size: 14px;"><b>Address:</b> ${fullAddress}</p>` : ''}
        ${unitNumber ? `<p style="margin: 0 0 8px 0; color: #ccc; font-size: 14px;"><b>${unitNumber}</b></p>` : ''}
        ${tenantName ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #333;">
            <p style="margin: 0 0 8px 0; color: #ccc; font-size: 14px;"><b>${tenantName}</b></p>
            ${tenantPhone ? `<p style="margin: 0; color: #ccc; font-size: 14px;"><b>${tenantPhone}</b></p>` : ''}
          </div>
        ` : ''}
      </div>
    `;

    return new NextResponse(
      generateHtml('Success!', 'Job Claimed Successfully', `You have been assigned to: <b>${ticket.title}</b>.${detailsHtml}`, '#10b981'),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error: any) {
    console.error('Accept Error:', error);
    return new NextResponse(
      generateHtml('Error', 'System Error', 'An unexpected error occurred while processing your request.', '#ef4444'),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

function generateHtml(title: string, heading: string, message: string, color: string) {
  // Use a simple icon depending on the color
  const iconContent = color === '#10b981' ? '✓' : color === '#ef4444' ? '✗' : '!';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #000; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background-color: #0D0D0D; border: 1px solid #1E1E1E; padding: 40px; border-radius: 16px; text-align: center; max-width: 400px; width: 90%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .icon { width: 64px; height: 64px; border-radius: 50%; background-color: ${color}20; color: ${color}; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; font-weight: bold; }
        h1 { margin: 0 0 10px; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
        p { margin: 0; color: #A1A1AA; font-size: 15px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${iconContent}</div>
        <h1>${heading}</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>
  `;
}
