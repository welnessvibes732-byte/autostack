import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role key so RLS doesn't block server-side inserts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // n8n sends an array — grab first item
    const body = await req.json()
    const item = Array.isArray(body) ? body[0] : body

    const { lease, tenant, unit, property: prop, meta } = item

    // org_id can be passed as a query param from n8n webhook URL
    const org_id = req.nextUrl.searchParams.get('org_id') || null

    // ── 1. PROPERTY: match or create ──────────────────────────────────
    let property_id: string | null = null
    let property_match = 'none'

    if (prop?.address_line1) {
      let query = supabase
        .from('properties')
        .select('id')
        .ilike('address_line1', prop.address_line1)

      if (org_id)      query = query.eq('organization_id', org_id)
      if (prop.pincode) query = query.eq('pincode', prop.pincode)
      else if (prop.city) query = query.ilike('city', prop.city)

      const { data: existing } = await query.limit(1).single()

      if (existing) {
        property_id = existing.id
        property_match = 'matched'
      } else {
        const { data: created, error } = await supabase
          .from('properties')
          .insert({
            organization_id: org_id,
            name:            prop.address_line1  || 'Unknown Property',
            address_line1:   prop.address_line1  || 'Unknown Address',
            address_line2:   prop.address_line2  || null,
            city:            prop.city           || 'Unknown',
            state:           prop.state          || null,
            pincode:         prop.pincode        || null,
            owner_name:      prop.owner_name     || null,
            owner_phone:     prop.owner_phone    || null,
            total_units:     0,
            year_built:      0,
            status:          'active',
          })
          .select('id')
          .single()

        if (error) console.error("Property insert error:", error);
        if (created) { property_id = created.id; property_match = 'created' }
      }
    }

    // ── 2. UNIT: match or create ───────────────────────────────────────
    let unit_id: string | null = null
    let unit_match = 'none'

    if (unit?.unit_number && property_id) {
      const { data: existing } = await supabase
        .from('units')
        .select('id')
        .ilike('unit_number', unit.unit_number)
        .eq('property_id', property_id)
        .limit(1)
        .single()

      if (existing) {
        unit_id = existing.id
        unit_match = 'matched'
      } else {
        const { data: created, error } = await supabase
          .from('units')
          .insert({
            property_id,
            organization_id: org_id,
            unit_number:     unit.unit_number || 'Unknown',
            unit_type:       unit.unit_type    || null,
            area_sqft:       unit.area_sqft    || null,
            floor_number:    unit.floor_number || null,
            status:          'occupied',
          })
          .select('id')
          .single()

        if (error) console.error("Unit insert error:", error);
        if (created) { unit_id = created.id; unit_match = 'created' }
      }
    }

    // ── 3. TENANT: tiered match or create ─────────────────────────────
    let tenant_id: string | null = null
    let tenant_match = 'none'
    let existingTenant: any = null

    if (tenant) {
      // Tier 1 — id_number + id_type (definitive)
      if (tenant.id_number && tenant.id_type) {
        let q = supabase
          .from('tenants')
          .select('*')
          .eq('id_number', tenant.id_number)
          .eq('id_type', tenant.id_type)
        if (org_id) q = q.eq('organization_id', org_id)
        const { data } = await q.limit(1).single()
        if (data) { existingTenant = data; tenant_match = 'matched_tier1_id' }
      }

      // Tier 2 — phone + full_name
      if (!existingTenant && tenant.phone && tenant.full_name) {
        let q = supabase
          .from('tenants')
          .select('*')
          .eq('phone', tenant.phone)
          .ilike('full_name', tenant.full_name)
        if (org_id) q = q.eq('organization_id', org_id)
        const { data } = await q.limit(1).single()
        if (data) { existingTenant = data; tenant_match = 'matched_tier2_phone_name' }
      }

      // Tier 3 — email + full_name
      if (!existingTenant && tenant.email && tenant.full_name) {
        let q = supabase
          .from('tenants')
          .select('*')
          .eq('email', tenant.email.toLowerCase())
          .ilike('full_name', tenant.full_name)
        if (org_id) q = q.eq('organization_id', org_id)
        const { data } = await q.limit(1).single()
        if (data) { existingTenant = data; tenant_match = 'matched_tier3_email_name' }
      }

      if (existingTenant) {
        tenant_id = existingTenant.id

        // Fill blank fields only — never overwrite existing data
        const fillable = [
          'email', 'phone', 'whatsapp_number', 'id_number', 'id_type',
          'employer_name', 'monthly_income', 'date_of_birth',
          'emergency_contact_name', 'emergency_contact_phone',
        ]
        const updates: Record<string, any> = {}
        for (const f of fillable) {
          if (!existingTenant[f] && tenant[f]) updates[f] = tenant[f]
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('tenants').update(updates).eq('id', tenant_id)
        }
      } else {
        // Create new tenant
        const { data: created, error } = await supabase
          .from('tenants')
          .insert({
            organization_id:         org_id,
            full_name:               tenant.full_name               || 'Unknown Tenant',
            phone:                   tenant.phone                   || 'Unknown',
            email:                   tenant.email                   || null,
            whatsapp_number:         tenant.whatsapp_number         || null,
            id_type:                 tenant.id_type                 || null,
            id_number:               tenant.id_number               || null,
            date_of_birth:           tenant.date_of_birth           || null,
            employer_name:           tenant.employer_name           || null,
            monthly_income:          tenant.monthly_income          || null,
            emergency_contact_name:  tenant.emergency_contact_name  || null,
            emergency_contact_phone: tenant.emergency_contact_phone || null,
            notes:                   lease?.notes                   || null,
          })
          .select('id')
          .single()

        if (error) console.error("Tenant insert error:", error);
        if (created) { tenant_id = created.id; tenant_match = 'created' }
      }
    }

    // ── 4. LEASE: always insert fresh ─────────────────────────────────
    const { data: leaseRecord, error: leaseError } = await supabase
      .from('leases')
      .insert({
        organization_id:       org_id,
        unit_id,
        tenant_id,
        start_date:            lease?.start_date            || null,
        expiry_date:           lease?.expiry_date           || null,
        rent_amount:           lease?.rent_amount           || null,
        deposit_amount:        lease?.deposit_amount        || null,
        payment_due_day:       lease?.payment_due_day       || null,
        lease_type:            lease?.lease_type            || null,
        notice_period_days:    lease?.notice_period_days    || null,
        has_pet_clause:        lease?.has_pet_clause        ?? null,
        has_subletting_clause: lease?.has_subletting_clause ?? null,
        has_escalation_clause: lease?.has_escalation_clause ?? null,
        escalation_percent:    lease?.escalation_percent    || null,
        maintenance_by:        lease?.maintenance_by        || null,
        late_fee_amount:       lease?.late_fee_amount       || null,
        lease_status:          lease?.lease_status          || 'draft',
        notes:                 lease?.notes                 || null,
        needs_manual_review:   meta?.needs_manual_review    ?? false,
        missing_fields:        meta?.missing_fields         || [],
      })
      .select('id')
      .single()

    if (leaseError) {
      console.error('Lease insert error:', leaseError)
      return NextResponse.json({ success: false, error: leaseError.message }, { status: 500 })
    }

    // ── RESPONSE ──────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      lease_id:       leaseRecord?.id,
      tenant_id,
      unit_id,
      property_id,
      match_summary: {
        property: property_match,
        unit:     unit_match,
        tenant:   tenant_match,
      },
    })

  } catch (err: any) {
    console.error('lease-import error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
