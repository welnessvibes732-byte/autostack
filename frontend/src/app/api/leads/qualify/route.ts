import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uses service role key — called by n8n after AI scoring (no user session)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Minimum score (out of 100) to auto-qualify a lead
const QUALIFY_THRESHOLD = 70;

export async function POST(req: Request) {
  try {
    const {
      lead_id,
      score,           // number 0-100 from AI
      ai_notes,        // string — AI reasoning/summary
      move_in_timeline,// extracted from reply e.g. "3 months"
      bedrooms,        // extracted from reply e.g. 2
      budget_max,      // extracted from reply
      answers          // raw answers object from AI { q1: "...", q2: "..." }
    } = await req.json();

    if (!lead_id || score === undefined) {
      return NextResponse.json({ error: 'lead_id and score are required' }, { status: 400 });
    }

    const numScore = Number(score);
    const isQualified = numScore >= QUALIFY_THRESHOLD;

    // Build update payload
    const updatePayload: Record<string, any> = {
      lead_score:             numScore,
      last_contact_at:        new Date().toISOString(),
      qualification_answers:  answers || null,
      notes:                  ai_notes ? `[AI Score: ${numScore}/100] ${ai_notes}` : undefined,
    };

    // Auto-move to "qualified" if score is good
    if (isQualified) {
      updatePayload.stage = 'qualified';
      updatePayload.is_hot = numScore >= 85; // Mark as hot lead if very high score
    }

    // Extract structured data from AI if provided
    if (move_in_timeline) updatePayload.move_in_timeline = move_in_timeline;
    if (bedrooms)         updatePayload.bedrooms         = Number(bedrooms);
    if (budget_max)       updatePayload.budget_max       = Number(budget_max);

    const { error } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', lead_id);

    if (error) throw error;

    return NextResponse.json({
      success:     true,
      qualified:   isQualified,
      score:       numScore,
      new_stage:   isQualified ? 'qualified' : 'new',
      is_hot:      numScore >= 85
    });

  } catch (error: any) {
    console.error('qualify error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
