import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getAdminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const ticket_id = searchParams.get('ticket_id')

    if (!ticket_id) return NextResponse.json({ error: 'Missing ticket_id' }, { status: 400 })

    const supabaseAdmin = getAdminClient()
    const { data, error } = await supabaseAdmin
      .from('maintenance_tickets')
      .select('id, title, description, category, priority, status, estimated_cost, actual_cost, created_at')
      .eq('id', ticket_id)
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { ticket_id, actual_cost } = await req.json()

    if (!ticket_id || !actual_cost) {
      return NextResponse.json({ error: 'Missing ticket_id or actual_cost' }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()

    const { data, error } = await supabaseAdmin
      .from('maintenance_tickets')
      .update({
        actual_cost: parseFloat(actual_cost),
        status: 'quoted'
      })
      .eq('id', ticket_id)
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
