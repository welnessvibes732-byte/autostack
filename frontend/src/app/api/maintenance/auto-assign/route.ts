import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { ticket_id } = await req.json();

    if (!ticket_id) {
      return NextResponse.json({ error: 'ticket_id is required' }, { status: 400 });
    }

    // 1. Fetch the ticket and its related property
    const { data: ticket, error: ticketError } = await supabase
      .from('maintenance_tickets')
      .select('*, unit:units(property:properties(pincode))')
      .eq('id', ticket_id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const pincode = ticket.unit?.property?.pincode;
    if (!pincode) {
      return NextResponse.json({ message: 'No pincode found for property, auto-assign skipped.' });
    }

    // 2. Fetch eligible vendors
    let query = supabase
      .from('vendors')
      .select('*')
      .eq('organization_id', ticket.organization_id)
      .eq('is_blacklisted', false)
      .contains('service_pincodes', [pincode]);

    if (ticket.category) {
       query = query.contains('category', [ticket.category]);
    }

    const { data: vendors, error: vendorsError } = await query;

    if (vendorsError || !vendors || vendors.length === 0) {
      return NextResponse.json({ message: 'No eligible vendors found for this pincode and category.' });
    }

    // 3. Fetch active tickets to calculate current workloads for these vendors
    const vendorIds = vendors.map(v => v.id);
    const { data: activeTickets } = await supabase
      .from('maintenance_tickets')
      .select('vendor_id')
      .in('status', ['open', 'in_progress'])
      .in('vendor_id', vendorIds);

    // Calculate active job count per vendor
    const activeJobsCount: Record<string, number> = {};
    activeTickets?.forEach(t => {
      if (t.vendor_id) {
        activeJobsCount[t.vendor_id] = (activeJobsCount[t.vendor_id] || 0) + 1;
      }
    });

    // 4. Advanced Scoring Algorithm
    // Weightings:
    // is_preferred = +50 points
    // rating = (rating / 5) * 50 points (Max 50)
    // workload penalty = -15 points per active job
    // response time penalty = -2 points per average response hour
    
    const scoredVendors = vendors.map(vendor => {
      let score = 0;
      
      if (vendor.is_preferred) score += 50;
      
      const rating = vendor.rating || 0;
      score += (rating / 5.0) * 50;
      
      const activeJobs = activeJobsCount[vendor.id] || 0;
      score -= (activeJobs * 15);
      
      const avgResponse = vendor.avg_response_hours || 24; // Default to 24h if unknown
      score -= (avgResponse * 2);

      return { ...vendor, score, activeJobs };
    });

    // Sort by highest score first
    scoredVendors.sort((a, b) => b.score - a.score);
    const winningVendor = scoredVendors[0];

    // 5. Assign the vendor to the ticket
    const { error: updateError } = await supabase
      .from('maintenance_tickets')
      .update({
        vendor_id: winningVendor.id,
        status: 'assigned',
        assigned_at: new Date().toISOString()
      })
      .eq('id', ticket_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket successfully auto-assigned',
      vendor: winningVendor,
      algorithm_details: {
        considered_vendors: scoredVendors.length,
        winning_score: winningVendor.score,
        winning_active_jobs: winningVendor.activeJobs
      }
    });

  } catch (error: any) {
    console.error('Auto-assign error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
