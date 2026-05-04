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

    // 1. Fetch user to get user_id and organization_id (for audit logging purposes in n8n)
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    
    // We get the organization_id from the lead itself (RLS ensures they can only fetch their own org's lead)
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('organization_id')
      .eq('id', lead_id)
      .single();

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });
    }

    // 2. Forward payload to n8n Webhook for W3
    const n8nWebhookUrl = process.env.N8N_LEAD_STAGE_WEBHOOK_URL;
    
    if (n8nWebhookUrl) {
      try {
        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: lead_id,
            stage: new_stage,
            user_id: user?.id || 'system',
            organization_id: lead.organization_id
          })
        });

        if (!response.ok) {
          console.error("n8n webhook responded with status:", response.status);
        }
      } catch (e) {
        console.error("Failed to call n8n webhook", e);
        // Fallback: If n8n webhook fails or isn't reachable, just update the DB directly so the UI doesn't break
        await supabase.from('leads').update({ stage: new_stage }).eq('id', lead_id);
      }
    } else {
      console.warn("N8N_LEAD_STAGE_WEBHOOK_URL is not defined. Updating database directly.");
      const { error: updateErr } = await supabase
        .from('leads')
        .update({ stage: new_stage })
        .eq('id', lead_id);
        
      if (updateErr) {
        throw updateErr;
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Stage update error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
