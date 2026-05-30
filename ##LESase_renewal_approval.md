# PropIQ — Lease Renewal Approval System
# Touches: /app/leases, /app/approvals (Tab 2)
# Tables: leases, units, properties, tenants, audit_log

---

## WHAT THIS SOLVES

A property manager handling 80 leases cannot reliably track which ones need renewal conversations. They miss the window, tenants find other properties, landlords lose income and blame the agency. PropIQ catches every expiry 90 days early, automates the renewal offer, and tracks the entire process without anyone needing to remember anything.

---

## LEASES PAGE — /app/leases

### Full Page Structure

**Header row:**
- Title: Leases
- Button: Add Lease (opens form)
- Button: Upload Lease PDF (opens file picker → triggers RAG ingestion)
- Filter bar: Status dropdown, Expiry date range, Property selector, Search by tenant name

**Stats row (4 cards):**
- Active Leases: count where lease_status = 'active'
- Expiring Soon: count where expiry_date <= today + 90 days AND lease_status = 'active'
- Renewal Offers Sent: count where renewal_status = 'offered'
- Expired: count where lease_status = 'expired'

**Expiry Alert Banner:**
If any lease expires in less than 30 days, show a red banner at top:
"⚠️ [N] lease(s) expire within 30 days. Immediate action required."
Clicking banner jumps to filtered view showing only those leases.

**Main table:**
Columns: Tenant | Unit | Property | Start Date | Expiry Date | Days Left | Rent | Status | Renewal | Actions

**Color coding on rows:**
- Red background tint: expiry in < 30 days
- Amber background tint: expiry in 30–60 days
- Yellow background tint: expiry in 60–90 days
- No tint: expiry > 90 days or already renewed

---

## SUPABASE QUERY FOR LEASES PAGE

```typescript
const { data: leases } = await supabase
  .from('leases')
  .select(`
    id,
    tenant_name,
    tenant_email,
    tenant_phone,
    unit_id,
    start_date,
    expiry_date,
    rent_amount,
    deposit_amount,
    lease_status,
    renewal_status,
    has_pet_clause,
    has_subletting_clause,
    maintenance_by,
    notice_period_days,
    file_path,
    index_status,
    needs_manual_review,
    missing_fields,
    created_at,
    updated_at,
    units ( unit_number, status, property_id,
      properties ( name, city, address_line1 )
    )
  `)
  .eq('organization_id', orgId)
  .order('expiry_date', { ascending: true })
```

---

## LEASE ROW — FULL DETAIL

Each row shows:

**Tenant name** — bold
**Unit number** — from units.unit_number
**Property** — from units.properties.name + city
**Start date** — DD MMM YYYY
**Expiry date** — DD MMM YYYY
**Days left** — calculate: expiry_date - TODAY
  - Show as: "23 days" (red if < 30), "45 days" (amber), "67 days" (yellow)
  - If expired: show "Expired X days ago" in red
**Rent amount** — ₹X,XX,XXX / month
**Lease status badge:**
  - active: green
  - expired: red
  - terminated: grey
  - renewed: blue
**Renewal status badge:**
  - null/not started: grey "Not Started"
  - pending: amber "Pending"
  - offered: blue "Offer Sent"
  - accepted: green "Accepted"
  - declined: red "Declined"
**Index status** (small icon):
  - pending: grey clock icon (document not yet indexed)
  - indexed: green check icon (searchable in AI)
  - failed: red X icon (indexing failed)

---

## EXPAND ROW — LEASE DETAIL

Clicking a row expands it to show:
- All lease terms extracted by AI: pet clause, subletting, maintenance responsibility, escalation
- Missing fields warning (if needs_manual_review = true)
- Clause summary cards for key terms
- Button: Ask AI about this lease → navigates to /app/search with this lease pre-filtered
- Document viewer button → opens PDF from Supabase Storage
- Payment history tab: shows rent_payments for this lease
- Amendment history: shows lease_amendments records

---

## UPLOAD LEASE PDF — EXACT FLOW

```typescript
const handleLeaseUpload = async (file: File) => {
  setUploading(true)

  try {
    // 1. Upload to Supabase Storage
    const filePath = `${orgId}/leases/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // 2. Insert into documents table
    await supabase.from('documents').insert({
      organization_id: orgId,
      file_name: file.name,
      file_path: filePath,
      file_type: 'pdf',
      doc_type: 'lease',
      index_status: 'pending',
      created_at: new Date().toISOString()
    })

    // 3. Call n8n RAG ingestion webhook
    await fetch(process.env.NEXT_PUBLIC_N8N_LEASE_INGEST_WEBHOOK!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: filePath,
        organization_id: orgId
      })
    })

    toast.success('Lease uploaded. AI is extracting details — this takes about 60 seconds.')

    // 4. Subscribe to realtime — when n8n finishes, leases table gets a new row
    // Refetch leases after 30 seconds as fallback
    setTimeout(() => refetchLeases(), 30000)

  } catch (error) {
    toast.error('Upload failed. Please try again.')
  } finally {
    setUploading(false)
  }
}
```

---

## SEND RENEWAL OFFER BUTTON

Only show this button when:
- lease_status = 'active'
- expiry_date <= today + 90 days
- renewal_status IS NULL or renewal_status = 'pending'

```typescript
const handleSendRenewalOffer = async (lease: Lease) => {
  setLoadingLease(lease.id)

  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_N8N_LEASE_RENEWAL_WEBHOOK!,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_renewal_offer',
          lease_id: lease.id,
          tenant_name: lease.tenant_name,
          tenant_email: lease.tenant_email,
          unit_id: lease.unit_id,
          expiry_date: lease.expiry_date,
          current_rent: lease.rent_amount,
          notice_period_days: lease.notice_period_days,
          organization_id: orgId,
          sent_by: currentUser.id
        })
      }
    )

    if (!response.ok) throw new Error('Webhook failed')

    // Optimistic update
    setLeases(prev =>
      prev.map(l =>
        l.id === lease.id
          ? { ...l, renewal_status: 'offered' }
          : l
      )
    )

    toast.success(`Renewal offer sent to ${lease.tenant_name}`)

  } catch (error) {
    toast.error('Failed to send renewal offer. Please try again.')
  } finally {
    setLoadingLease(null)
  }
}
```

---

## MARK AS RENEWED BUTTON

Show when renewal_status = 'offered':

```typescript
const handleMarkRenewed = async (leaseId: string) => {
  const confirmed = confirm('Confirm this lease has been renewed?')
  if (!confirmed) return

  setLoadingLease(leaseId)

  try {
    // Update directly in Supabase
    await supabase
      .from('leases')
      .update({
        renewal_status: 'accepted',
        lease_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', leaseId)

    // Log to audit
    await supabase.from('audit_log').insert({
      organization_id: orgId,
      user_id: currentUser.id,
      action: 'lease_renewed',
      entity_type: 'lease',
      entity_id: leaseId,
      created_at: new Date().toISOString()
    })

    setLeases(prev =>
      prev.map(l =>
        l.id === leaseId
          ? { ...l, renewal_status: 'accepted' }
          : l
      )
    )

    toast.success('Lease marked as renewed')

  } catch (error) {
    toast.error('Update failed. Please try again.')
  } finally {
    setLoadingLease(null)
  }
}
```

---

## ADD LEASE FORM — MANUAL ENTRY

Show this when Add Lease button is clicked. A slide-in panel from the right with fields:

**Required fields:**
- Tenant name (text)
- Unit selector (dropdown from units table)
- Start date (date picker)
- Expiry date (date picker)
- Rent amount (number)
- Deposit amount (number)

**Optional fields:**
- Tenant email
- Tenant phone
- Notice period (days, default 30)
- Lease type (residential / commercial)
- Payment due day (number, default 1)
- Has pet clause (toggle)
- Has subletting clause (toggle)
- Maintenance by (dropdown: landlord / tenant / shared)
- Late fee amount (number)
- Notes (textarea)

On submit:
```typescript
const { data, error } = await supabase
  .from('leases')
  .insert({
    organization_id: orgId,
    ...formData,
    lease_status: 'active',
    index_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .select()
  .single()
```

After insert: update the units table to set status = 'occupied' for the selected unit:
```typescript
await supabase
  .from('units')
  .update({ status: 'occupied' })
  .eq('id', formData.unit_id)
```

Close panel, show toast, refetch leases list.

---

## WHAT HAPPENS IN n8n AFTER RENEWAL WEBHOOK

The n8n W_LeaseRenewal workflow does:
1. Updates leases table: renewal_status = 'offered'
2. Sends renewal offer email to tenant via Gmail with:
   - Current lease terms
   - Expiry date
   - Proposed new start date
   - Request to confirm renewal or notify of move-out
3. Inserts into audit_log
4. Schedules follow-up: if no response in 14 days, sends reminder email

---

## LEASES TABLE — SUPABASE SCHEMA (reference)

```sql
leases table columns used on this page:
- id (UUID)
- organization_id (UUID)
- unit_id (UUID → units)
- tenant_name (TEXT)
- tenant_email (TEXT)
- tenant_phone (TEXT)
- start_date (DATE)
- expiry_date (DATE)
- rent_amount (NUMERIC)
- deposit_amount (NUMERIC)
- payment_due_day (INT)
- notice_period_days (INT)
- lease_type (TEXT)
- lease_status (TEXT) — draft|active|expired|terminated
- renewal_status (TEXT) — null|pending|offered|accepted|declined
- has_pet_clause (BOOLEAN)
- has_subletting_clause (BOOLEAN)
- has_escalation_clause (BOOLEAN)
- escalation_percent (NUMERIC)
- maintenance_by (TEXT) — landlord|tenant|shared
- late_fee_amount (NUMERIC)
- jurisdiction (TEXT)
- file_path (TEXT)
- stored_hash (TEXT)
- index_status (TEXT) — pending|indexing|indexed|failed
- needs_manual_review (BOOLEAN)
- missing_fields (TEXT[])
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

---

## ENVIRONMENT VARIABLES NEEDED

```
NEXT_PUBLIC_N8N_LEASE_INGEST_WEBHOOK=https://your-n8n/webhook/propiq-lease-ingest
NEXT_PUBLIC_N8N_LEASE_RENEWAL_WEBHOOK=https://your-n8n/webhook/propiq-lease-renewal
```

---

## HOW TO GIVE THIS TO ANTIGRAVITY

Give this file as context. Then say:

"Build the /app/leases page exactly as described in this file. Use the existing supabase client and design system. Build in this order: 1) Stats row with 4 cards, 2) Expiry alert banner that shows when leases expire within 30 days, 3) Main leases table with color-coded rows based on expiry urgency, 4) Upload Lease PDF button with the exact flow shown, 5) Expand row to show lease details, 6) Send Renewal Offer button with exact implementation, 7) Mark as Renewed button, 8) Add Lease manual form as slide-in panel. All Supabase calls use the existing client from lib/supabase.ts. All webhook calls use fetch() with the exact payloads shown."