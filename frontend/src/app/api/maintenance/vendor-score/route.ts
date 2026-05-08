import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key since this is called by n8n (no user session)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Support either a single object or an array of vendor scores
    const vendors = Array.isArray(data) ? data : [data];

    if (vendors.length === 0) {
      return NextResponse.json({ success: true, message: 'No vendors to update' });
    }

    // Validate the first vendor to ensure structure is correct
    if (!vendors[0].vendor_id) {
       return NextResponse.json({ error: 'vendor_id is required' }, { status: 400 });
    }

    // Update each vendor. Using a loop since Supabase bulk update (upsert) 
    // requires all non-nullable fields or it might overwrite them if not careful.
    // For safety, we update one by one. If there are many vendors, an RPC is better, 
    // but this is fine for typical vendor counts.
    for (const v of vendors) {
      const updatePayload: any = {
        updated_at: new Date().toISOString()
      };

      if (v.rating !== undefined) updatePayload.rating = Number(v.rating);
      if (v.jobs_completed !== undefined) updatePayload.jobs_completed = Number(v.jobs_completed);
      if (v.avg_response_hours !== undefined) updatePayload.avg_response_hours = Number(v.avg_response_hours);
      if (v.avg_cost_per_job !== undefined) updatePayload.avg_cost_per_job = Number(v.avg_cost_per_job);

      const { error } = await supabase
        .from('vendors')
        .update(updatePayload)
        .eq('id', v.vendor_id);

      if (error) {
        console.error(`Error updating vendor ${v.vendor_id}:`, error);
        // Continue with others even if one fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Updated scores for ${vendors.length} vendors` 
    });

  } catch (error: any) {
    console.error('vendor-score error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
