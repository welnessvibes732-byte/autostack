import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uses service role key — called by n8n (no user session)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Minimum score (out of 100) to auto-qualify a lead
const QUALIFY_THRESHOLD = 70;

export async function POST(req: Request) {
  try {
    const {
      email,            // lead's email — n8n sends this, we find the lead_id ourselves
      score,            // number 0-100 from AI
      ai_notes,         // string — AI reasoning/summary
      move_in_timeline, // extracted from reply e.g. "3 months"
      bedrooms,         // extracted from reply e.g. 2
      budget_max,       // extracted from reply
      answers           // raw answers object { q1: "...", q2: "..." }
    } = await req.json();

    if (!email || score === undefined) {
      return NextResponse.json({ error: 'email and score are required' }, { status: 400 });
    }

    // Look up lead by email internally — n8n doesn't need to know the lead_id
    const { data: lead, error: lookupErr } = await supabase
      .from('leads')
      .select('id, full_name')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lookupErr || !lead) {
      return NextResponse.json({ error: `No lead found with email: ${email}` }, { status: 404 });
    }

    const numScore = Number(score);
    const isQualified = numScore >= QUALIFY_THRESHOLD;
    const isHot = numScore >= 85;

    // Build update payload
    const updatePayload: Record<string, any> = {
      lead_score:             numScore,
      last_contact_at:        new Date().toISOString(),
      qualification_answers:  answers || null,
      notes: ai_notes ? `[AI Score: ${numScore}/100] ${ai_notes}` : undefined,
    };

    // Auto-move to "qualified" if score is good
    if (isQualified) {
      updatePayload.stage  = 'qualified';
      updatePayload.is_hot = isHot;
    }

    // Store extracted structured data from AI reply
    if (move_in_timeline) updatePayload.move_in_timeline = move_in_timeline;
    if (bedrooms)         updatePayload.bedrooms         = Number(bedrooms);
    if (budget_max)       updatePayload.budget_max       = Number(budget_max);

    const { error: updateErr } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', lead.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success:   true,
      lead_id:   lead.id,
      full_name: lead.full_name,
      qualified: isQualified,
      is_hot:    isHot,
      score:     numScore,
      new_stage: isQualified ? 'qualified' : 'new',
    });

  } catch (error: any) {
    console.error('qualify error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
