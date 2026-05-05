import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uses service role key — called by n8n (no user session)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { lead_id, email } = await req.json();

    if (!lead_id && !email) {
      return NextResponse.json({ error: 'lead_id or email is required' }, { status: 400 });
    }

    let query = supabase
      .from('leads')
      .update({
        last_contact_at:   new Date().toISOString(),
        auto_responded:    true,
        auto_responded_at: new Date().toISOString(),
      });

    // Accept either lead_id or email
    if (lead_id) {
      query = query.eq('id', lead_id);
    } else {
      query = query.eq('email', email);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Contact updated' });

  } catch (error: any) {
    console.error('update-contact error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
