import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key since this is called by n8n (no user session)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { 
      organization_id, 
      entity_type, 
      entity_id, 
      message, 
      severity 
    } = await req.json();

    if (!message || !organization_id) {
      return NextResponse.json({ error: 'message and organization_id are required' }, { status: 400 });
    }

    const alertPayload = {
      organization_id,
      alert_type: 'predictive_maintenance',
      entity_type: entity_type || 'unit', // usually 'unit'
      entity_id: entity_id || null,       // the unit_id
      message,
      severity: severity || 'warning',    // 'info', 'warning', 'critical'
      is_read: false,
      sent_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('alerts')
      .insert(alertPayload)
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: 'Predictive alert created',
      alert_id: data.id 
    });

  } catch (error: any) {
    console.error('create-alert error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
