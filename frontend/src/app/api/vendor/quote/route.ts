import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createAdminClient,
  parseJson,
  uuidSchema,
  verifyVendorPortalToken,
} from '@/lib/api/security'

const quoteSchema = z.object({
  ticket_id: uuidSchema,
  vendor_id: uuidSchema,
  token: z.string().min(16),
  actual_cost: z.coerce.number().positive().max(10_000_000),
})

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const ticket_id = searchParams.get('ticket_id')
    const vendor_id = searchParams.get('vendor_id')
    const token = searchParams.get('token')

    if (!ticket_id || !vendor_id) {
      return NextResponse.json({ error: 'Missing ticket_id or vendor_id' }, { status: 400 })
    }

    if (!verifyVendorPortalToken({ ticketId: ticket_id, vendorId: vendor_id, purpose: 'quote', token })) {
      return NextResponse.json({ error: 'Invalid or expired quote link' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
      .from('maintenance_tickets')
      .select('id, title, description, category, priority, status, estimated_cost, actual_cost, created_at, vendor_id')
      .eq('id', ticket_id)
      .eq('vendor_id', vendor_id)
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await parseJson(req, quoteSchema)
    if (parsed.error) return parsed.error

    const { ticket_id, vendor_id, token, actual_cost } = parsed.data
    if (!verifyVendorPortalToken({ ticketId: ticket_id, vendorId: vendor_id, purpose: 'quote', token })) {
      return NextResponse.json({ error: 'Invalid or expired quote link' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()

    const { data, error } = await supabaseAdmin
      .from('maintenance_tickets')
      .update({
        actual_cost,
        status: 'quoted'
      })
      .eq('id', ticket_id)
      .eq('vendor_id', vendor_id)
      .select()
      .single()

    if (error) {
      console.error("Supabase Admin Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })

  } catch (error: any) {
    console.error("API Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
