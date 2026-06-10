import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the service role key to allow server-side background updates if needed, 
// but we will primarily rely on the user's Auth token passed from the frontend to enforce RLS.
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

    const { lead_id, new_stage } = await req.json();

    if (!lead_id || !new_stage) {
      return NextResponse.json({ error: 'lead_id and new_stage are required' }, { status: 400 });
    }

    // 1. Fetch current user for audit trail
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Always update the stage in DB first
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('organization_id, email, full_name')
      .eq('id', lead_id)
      .single();

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
    }

    const { error: updateErr } = await supabase
      .from('leads')
      .update({ stage: new_stage })
      .eq('id', lead_id);

    if (updateErr) throw updateErr;

    // 3. Send Native "Closed Won" email
    if (new_stage === 'closed_won' && lead.email) {
      try {
        const { sendEmail } = await import('@/lib/email');
        await sendEmail({
          to: lead.email,
          subject: "Welcome to your new home!",
          html: `<p>Hi ${lead.full_name},</p><p>Congratulations! Your application has been approved and the deal is closed. We are excited to welcome you to our community.</p>`
        });
      } catch (e) {
        console.error("Failed to send welcome email", e);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Stage update error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
