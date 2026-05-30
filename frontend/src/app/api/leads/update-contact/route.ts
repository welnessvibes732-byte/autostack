import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Define the expected shape of the incoming webhook using Zod
const updateContactSchema = z.object({
  lead_id: z.string().uuid().optional(),
  email: z.string().email().optional()
}).refine(data => data.lead_id || data.email, {
  message: "Either lead_id or email must be provided",
  path: ["lead_id", "email"]
});

export async function POST(req: Request) {
  try {
    // 1. Verify Webhook Secret (Prevent Unauthorized Access)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 });
    }

    // 2. Validate Input Payload using Zod
    const body = await req.json();
    const parsedData = updateContactSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json({ 
        error: 'Invalid payload', 
        details: parsedData.error.flatten() 
      }, { status: 400 });
    }

    const { lead_id, email } = parsedData.data;

    // Uses service role key ONLY after validating webhook secret and payload
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('leads')
      .update({
        last_contact_at:   new Date().toISOString(),
        auto_responded:    true,
        auto_responded_at: new Date().toISOString(),
      });

    if (lead_id) {
      query = query.eq('id', lead_id);
    } else if (email) {
      query = query.eq('email', email);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Contact updated securely' });

  } catch (error: any) {
    console.error('update-contact error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

