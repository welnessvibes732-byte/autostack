# PropIQ — Maintenance Approval System
# Touches: /app/maintenance, /app/approvals (Tab 3)
# Tables: maintenance_tickets, vendors, units, properties, audit_log

---

## WHAT THIS SOLVES

Maintenance requests get lost in WhatsApp. Vendor quotes sit in email. Property managers spend hours chasing vendors and manually coordinating. PropIQ logs every request, assigns vendors automatically, routes quotes for approval with one click, and tracks every ticket from open to closed.

---

## MAINTENANCE PAGE — /app/maintenance

### Full Page Structure

**Header row:**
- Title: Maintenance
- Button: New Request (opens form)
- Filter bar: Status dropdown, Priority dropdown, Category dropdown, Property selector, Date range

**Stats row (4 cards):**
- Open Tickets: count where status = 'open'
- In Progress: count where status IN ('assigned', 'in_progress', 'quoted')
- Pending Approval: count where status = 'quoted' AND actual_cost IS NOT NULL
- Completed This Month: count where status = 'completed' AND completed_at >= start of current month

**Overdue Alert Banner:**
If any ticket is open or assigned for more than 48 hours with no update, show amber banner:
"⚠️ [N] ticket(s) have had no update in over 48 hours."

**Main content:**
Two view options (toggle buttons in header):
1. **List View** (default) — table with all tickets
2. **Board View** — Kanban columns by status

---

## LIST VIEW — TABLE

Columns: Title | Property/Unit | Category | Priority | Vendor | Status | Cost | Waiting | Actions

### Supabase Query

```typescript
const { data: tickets } = await supabase
  .from('maintenance_tickets')
  .select(`
    id,
    title,
    description,
    category,
    priority,
    status,
    estimated_cost,
    actual_cost,
    photos,
    resolution_notes,
    reported_at,
    assigned_at,
    started_at,
    completed_at,
    created_at,
    updated_at,
    units (
      unit_number,
      properties ( name, city )
    ),
    vendors (
      name,
      phone,
      rating,
      avg_response_hours,
      avg_cost_per_job
    )
  `)
  .eq('organization_id', orgId)
  .order('priority', { ascending: false })
  .order('created_at', { ascending: true })
```

---

## TICKET ROW — FULL DETAIL

**Title** — bold, clickable to expand
**Property/Unit** — units.properties.name + " — Unit " + units.unit_number
**Category badge** — plumbing (blue), electrical (yellow), painting (purple), carpentry (brown), cleaning (green), structural (red), hvac (cyan), other (grey)
**Priority badge:**
  - urgent: red solid
  - high: amber solid
  - medium: grey outline
  - low: grey light
**Vendor name** — if assigned. If not assigned: "Unassigned" in grey
**Vendor rating** — star rating if vendor linked
**Status badge:**
  - open: grey "Open"
  - assigned: blue "Assigned"
  - quoted: amber "Quote Pending"
  - in_progress: blue "In Progress"
  - completed: green "Completed"
  - closed: grey "Closed"
  - cancelled: red "Cancelled"
**Estimated cost** — ₹X,XXX (from estimated_cost)
**Quoted cost** — ₹X,XXX (from actual_cost if quoted)
**Deviation alert:** if actual_cost > estimated_cost * 1.2: show red "↑ X% over estimate"
**Waiting time** — calculate from reported_at
  - If > 48 hours AND not completed: show amber "Overdue"

---

## EXPAND TICKET — DETAIL VIEW

Click row to expand:
- Full description text
- Photos grid (if photos array has items, show from Supabase Storage)
- Vendor details: name, phone, rating, avg response time, avg cost
- Cost breakdown: estimated vs quoted vs actual
- Timeline:
  - Reported: reported_at timestamp
  - Assigned: assigned_at timestamp (or "Not yet assigned")
  - Started: started_at timestamp (or "Not yet started")
  - Completed: completed_at timestamp (or "Pending")
- Resolution notes (editable text area if status = completed)
- Tenant rating (1-5 stars, only show if status = completed)

---

## NEW REQUEST FORM

Slide-in panel from right with fields:

**Required:**
- Title (text)
- Unit selector (dropdown from units table filtered by org)
- Category (dropdown: plumbing/electrical/painting/carpentry/cleaning/structural/hvac/other)
- Priority (dropdown: urgent/high/medium/low)
- Description (textarea)

**Optional:**
- Estimated cost (number)
- Photos (file picker, multiple files allowed, uploads to Supabase Storage)
- Assigned vendor (dropdown from vendors table filtered by category)

On submit:
```typescript
// 1. Upload photos if any
const photoUrls = []
for (const photo of photos) {
  const path = `${orgId}/maintenance/${Date.now()}_${photo.name}`
  await supabase.storage.from('maintenance').upload(path, photo)
  photoUrls.push(path)
}

// 2. Insert ticket
const { data: ticket } = await supabase
  .from('maintenance_tickets')
  .insert({
    organization_id: orgId,
    title: formData.title,
    description: formData.description,
    category: formData.category,
    priority: formData.priority,
    unit_id: formData.unit_id,
    estimated_cost: formData.estimated_cost || null,
    photos: photoUrls,
    status: 'open',
    reported_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  })
  .select()
  .single()

// 3. Call n8n vendor assignment webhook
await fetch(process.env.NEXT_PUBLIC_N8N_MAINTENANCE_ASSIGN_WEBHOOK!, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ticket_id: ticket.id,
    category: formData.category,
    priority: formData.priority,
    organization_id: orgId,
    preferred_vendor_id: formData.vendor_id || null
  })
})

toast.success('Maintenance request created. Assigning vendor...')
```

---

## APPROVE QUOTE BUTTON

Show when: status = 'quoted' AND actual_cost IS NOT NULL

```typescript
const handleApproveQuote = async (ticket: MaintenanceTicket) => {
  setLoadingTicket(ticket.id)

  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_N8N_MAINTENANCE_APPROVE_WEBHOOK!,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approved',
          ticket_id: ticket.id,
          vendor_id: ticket.vendor_id,
          approved_cost: ticket.actual_cost,
          organization_id: orgId,
          approved_by: currentUser.id,
          approved_at: new Date().toISOString()
        })
      }
    )

    if (!response.ok) throw new Error('Webhook failed')

    setTickets(prev =>
      prev.map(t =>
        t.id === ticket.id
          ? { ...t, status: 'in_progress' }
          : t
      )
    )

    toast.success('Quote approved. Vendor notified to proceed.')

  } catch (error) {
    toast.error('Approval failed. Please try again.')
  } finally {
    setLoadingTicket(null)
  }
}
```

---

## REJECT QUOTE BUTTON

Show when: status = 'quoted'

On click: show inline form:
- Text input: "Reason for rejection (vendor will see this)"
- Confirm Reject + Cancel buttons

On confirm:
```typescript
const response = await fetch(
  process.env.NEXT_PUBLIC_N8N_MAINTENANCE_APPROVE_WEBHOOK!,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'rejected',
      ticket_id: ticket.id,
      vendor_id: ticket.vendor_id,
      organization_id: orgId,
      rejection_reason: reason,
      rejected_by: currentUser.id
    })
  }
)
```

On success: update ticket status to 'assigned' in UI (vendor needs to requote), show toast.

---

## REQUEST REQUOTE BUTTON

Show when: status = 'quoted' AND amount_deviation > 20%

On click: show inline form:
- Text input: "Note to vendor about requote (e.g. please reduce cost)"
- Confirm + Cancel

On confirm: call same webhook with action = 'request_requote' + note

---

## MARK COMPLETE BUTTON

Show when: status = 'in_progress'

On click: show form:
- Actual cost incurred (number input)
- Resolution notes (textarea)
- Tenant rating (1-5 stars)

On submit:
```typescript
await supabase
  .from('maintenance_tickets')
  .update({
    status: 'completed',
    actual_cost: formData.actual_cost,
    resolution_notes: formData.notes,
    tenant_rating: formData.rating,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .eq('id', ticketId)

// Update vendor stats
await supabase.rpc('update_vendor_stats', {
  p_vendor_id: ticket.vendor_id,
  p_job_cost: formData.actual_cost,
  p_rating: formData.rating
})
```

---

## BOARD VIEW — KANBAN

Six columns:
1. Open
2. Assigned
3. Quote Pending
4. In Progress
5. Completed
6. Closed

Each column shows ticket cards. Cards are NOT draggable — status changes happen through action buttons only (dragging bypasses approval logic).

Card shows: title, property/unit, priority badge, vendor name, cost if quoted, waiting time.

---

## VENDORS PAGE — /app/maintenance/vendors

Linked from Maintenance page via "Vendors" tab or button.

### Vendor List

```typescript
const { data: vendors } = await supabase
  .from('vendors')
  .select('*')
  .eq('organization_id', orgId)
  .order('rating', { ascending: false })
```

Each vendor card shows:
- Name
- Category badges (array)
- Star rating (avg from past jobs)
- Jobs completed count
- Avg response time
- Avg cost per job
- Phone
- Is preferred toggle
- Is blacklisted badge (if true, show red)

### Add Vendor Form

Fields: name, categories (multi-select), phone, email, whatsapp, address, GSTIN, bank account, IFSC

On submit: insert into vendors table with organization_id.

---

## WHAT HAPPENS IN n8n AFTER WEBHOOKS

**W_MaintenanceAssign** (triggered on new ticket):
1. Queries vendors table for best match by category + rating
2. Updates ticket: vendor_id, status = 'assigned', assigned_at
3. Sends Gmail to vendor with ticket details
4. Schedules 24-hour follow-up check

**W_MaintenanceApprove** (triggered on approve/reject):
- Approve: updates status = 'in_progress', sends Gmail to vendor "Proceed with work"
- Reject: updates status = 'assigned', sends Gmail to vendor with rejection reason and requote request
- Request requote: sends Gmail with PM note, status stays 'assigned'

---

## MAINTENANCE TICKETS TABLE — SCHEMA (reference)

```sql
- id (UUID)
- organization_id (UUID)
- property_id (UUID)
- unit_id (UUID → units)
- vendor_id (UUID → vendors)
- title (TEXT)
- description (TEXT)
- category (TEXT)
- priority (TEXT) — low|medium|high|urgent
- status (TEXT) — open|assigned|quoted|in_progress|completed|closed|cancelled
- photos (TEXT[])
- estimated_cost (NUMERIC)
- actual_cost (NUMERIC)
- resolution_notes (TEXT)
- tenant_rating (INT)
- reported_at (TIMESTAMPTZ)
- assigned_at (TIMESTAMPTZ)
- started_at (TIMESTAMPTZ)
- completed_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

---

## ENVIRONMENT VARIABLES NEEDED

```
NEXT_PUBLIC_N8N_MAINTENANCE_ASSIGN_WEBHOOK=https://your-n8n/webhook/propiq-maintenance-assign
NEXT_PUBLIC_N8N_MAINTENANCE_APPROVE_WEBHOOK=https://your-n8n/webhook/propiq-maintenance-approval
```

---

## HOW TO GIVE THIS TO ANTIGRAVITY

Give this file as context. Then say:

"Build the /app/maintenance page exactly as described in this file. Use the existing supabase client and design system. Build in this order: 1) Stats row with 4 cards, 2) Overdue alert banner, 3) List view table with all columns and ticket rows, 4) Expand row detail with timeline and photos, 5) New Request form as slide-in panel with photo upload, 6) Approve Quote button with exact implementation, 7) Reject Quote inline form, 8) Mark Complete form, 9) Board view as alternative layout, 10) Vendors sub-page. Use the existing supabase client from lib/supabase.ts for all queries."