import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uses service role key — called by n8n (no user session)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { lead_id } = await req.json();

    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
    }

    // Update last_contact_at and mark that auto qualification email was sent
    const { error } = await supabase
      .from('leads')
      .update({
        last_contact_at:    new Date().toISOString(),
        auto_responded:     true,
        auto_responded_at:  new Date().toISOString(),
      })
      .eq('id', lead_id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Contact updated' });

  } catch (error: any) {
    console.error('update-contact error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
