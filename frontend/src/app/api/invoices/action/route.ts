import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createAdminClient,
  requireUserSupabase,
  parseJson,
  uuidSchema,
  jsonError,
} from '@/lib/api/security';

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
    const auth = await requireUserSupabase(req);
    if (auth.error) return auth.error;

    const parsed = await parseJson(req, approveSchema);
    if (parsed.error) return parsed.error;
    const { invoice_id, action, reason, payment_method, payment_ref, payment_date } = parsed.data;

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
      try { return JSON.parse(txt)[0]; } catch(e) { return null; }
    };

    if (action === 'approve') {
      try {
        const data = await updateInvoice('approved', {
          approved_by: auth.user.id,
          approved_at: new Date().toISOString()
        });
        return NextResponse.json({ success: true, invoice: data });
      } catch (error: any) {
        console.error('[INVOICE APPROVE ERROR]', error);
        return jsonError(error.message, 500);
      }
    }

    if (action === 'reject') {
      try {
        const data = await updateInvoice('rejected', {
          anomaly_reason: reason || 'Rejected by property manager'
        });
        return NextResponse.json({ success: true, invoice: data });
      } catch (error: any) {
        console.error('[INVOICE REJECT ERROR]', error);
        return jsonError(error.message, 500);
      }
    }

    if (action === 'pay') {
      try {
        const data = await updateInvoice('paid', {
          payment_date: payment_date || new Date().toISOString().split('T')[0],
          payment_ref: payment_ref || payment_method || 'direct'
        });
        return NextResponse.json({ success: true, invoice: data });
      } catch (error: any) {
        console.error('[INVOICE PAY ERROR]', error);
        return jsonError(error.message, 500);
      }
    }

    return jsonError('Invalid action', 400);

  } catch (error: any) {
    console.error('[INVOICE ACTION ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
