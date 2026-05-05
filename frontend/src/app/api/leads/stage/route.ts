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

    // 3. Forward to n8n W3 webhook (only for "closed" stage — Closed Won email)
    const n8nWebhookUrl = process.env.N8N_LEAD_STAGE_WEBHOOK_URL;
    if (n8nWebhookUrl && new_stage === 'closed') {
      try {
        await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id,
            stage: new_stage,
            email: lead.email,
            full_name: lead.full_name,
            user_id: user?.id || 'system',
            organization_id: lead.organization_id
          })
        });
      } catch (e) {
        console.error("Failed to call n8n W3 webhook", e);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Stage update error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
