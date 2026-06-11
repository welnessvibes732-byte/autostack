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

    // Use admin client so triggers fire without RLS interference
    const admin = createAdminClient();

    if (action === 'approve') {
      const { data, error } = await admin
        .from('invoices')
        .update({
          status: 'approved',
          approved_by: auth.user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', invoice_id)
        .select('id, status')
        .single();

      if (error) {
        console.error('[INVOICE APPROVE ERROR]', error);
        return jsonError(error.message, 500);
      }

      return NextResponse.json({ success: true, invoice: data });
    }

    if (action === 'reject') {
      const { data, error } = await admin
        .from('invoices')
        .update({
          status: 'rejected',
          anomaly_reason: reason || 'Rejected by property manager'
        })
        .eq('id', invoice_id)
        .select('id, status')
        .single();

      if (error) {
        console.error('[INVOICE REJECT ERROR]', error);
        return jsonError(error.message, 500);
      }

      return NextResponse.json({ success: true, invoice: data });
    }

    if (action === 'pay') {
      const { data, error } = await admin
        .from('invoices')
        .update({
          status: 'paid',
          payment_date: payment_date || new Date().toISOString().split('T')[0],
          payment_ref: payment_ref || payment_method || 'direct'
        })
        .eq('id', invoice_id)
        .select('id, status')
        .single();

      if (error) {
        console.error('[INVOICE PAY ERROR]', error);
        return jsonError(error.message, 500);
      }

      return NextResponse.json({ success: true, invoice: data });
    }

    return jsonError('Invalid action', 400);

  } catch (error: any) {
    console.error('[INVOICE ACTION ERROR]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
