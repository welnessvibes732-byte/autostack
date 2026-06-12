import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson, jsonError } from '@/lib/api/security';

const uuidSchema = z.string().uuid();

const approveSchema = z.object({
  invoice_id: uuidSchema,
  action: z.enum(['approve', 'reject', 'pay']),
  reason: z.string().max(1000).optional(),
  payment_method: z.string().optional(),
  payment_ref: z.string().optional(),
  payment_date: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Lightweight auth: verify bearer token via direct REST (no Supabase client = no WebSocket crash)
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (!token) return jsonError('Unauthorized', 401);

    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` }
    });
    const userData = await userRes.json();
    if (!userRes.ok || !userData?.id) return jsonError('Unauthorized', 401);
    const userId = userData.id;

    const parsed = await parseJson(req, approveSchema);
    if (parsed.error) return parsed.error;
    const { invoice_id, action, reason, payment_method, payment_ref, payment_date } = parsed.data;

    const updateInvoice = async (status: string, extraData: any = {}) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${invoice_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ status, ...extraData })
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || res.statusText);
      try { return JSON.parse(txt)[0]; } catch { return null; }
    };

    if (action === 'approve') {
      const data = await updateInvoice('approved', {
        approved_by: userId,
        approved_at: new Date().toISOString()
      });
      return NextResponse.json({ success: true, invoice: data });
    }

    if (action === 'reject') {
      const data = await updateInvoice('rejected', {
        anomaly_reason: reason || 'Rejected by property manager'
      });
      return NextResponse.json({ success: true, invoice: data });
    }

    if (action === 'pay') {
      const data = await updateInvoice('paid', {
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        payment_ref: payment_ref || payment_method || 'direct'
      });
      return NextResponse.json({ success: true, invoice: data });
    }

    return jsonError('Invalid action', 400);

  } catch (error: any) {
    console.error('[INVOICE ACTION ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
