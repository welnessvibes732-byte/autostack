# PropIQ — Deal Sign-Off System
# Touches: /app/leads, /app/approvals (Tab 4)
# Tables: leads, audit_log

---

## WHAT THIS SOLVES

When a lead reaches negotiation stage, agents make deals without manager visibility. Terms get agreed informally, nobody knows what was promised, deals fall through at final stage because the right person was never looped in. PropIQ creates a formal sign-off step — the agent requests approval, manager gets full context in one view, approves or sends back with feedback. Every deal decision is logged.

---

## LEADS PAGE — /app/leads

### Full Page Structure

**Header row:**
- Title: Leads
- Button: Add Lead (opens form)
- Toggle: Kanban View / List View
- Filter bar: Source dropdown, Score range, Inquiry type, Date range

**Stats row (4 cards):**
- Total Leads: count all
- Hot Leads: count where is_hot = true AND stage NOT IN ('closed_won','closed_lost')
- In Negotiation: count where stage IN ('negotiating','pending_signoff')
- Closed This Month: count where stage = 'closed_won' AND updated_at >= start of month

---

## KANBAN VIEW

Seven columns left to right:
1. **New** — stage = 'new'
2. **Qualified** — stage = 'qualified'
3. **Viewing Scheduled** — stage = 'viewing_scheduled'
4. **Negotiating** — stage = 'negotiating'
5. **Pending Sign-off** — stage = 'pending_signoff'
6. **Closed Won** — stage = 'closed_won'
7. **Closed Lost** — stage = 'closed_lost'

Columns 6 and 7 are collapsed by default (show count only, click to expand).

Cards are NOT draggable. Stage changes happen through buttons only. This is intentional — stage changes trigger n8n workflows and audit logs, dragging would bypass that.

### Supabase Query for Leads

```typescript
const { data: leads } = await supabase
  .from('leads')
  .select(`
    id,
    full_name,
    email,
    phone,
    source,
    inquiry_type,
    budget_min,
    budget_max,
    preferred_area,
    property_type,
    bedrooms,
    move_in_timeline,
    lead_score,
    classification,
    is_hot,
    stage,
    score_reason,
    follow_up_day,
    last_contact_at,
    next_follow_up_at,
    qualification_answers,
    notes,
    created_at,
    updated_at
  `)
  .eq('organization_id', orgId)
  .order('lead_score', { ascending: false })
```

---

## LEAD CARD — WHAT IT SHOWS

Each lead card on Kanban shows:

**Top row:**
- Lead name (bold)
- Hot badge: if is_hot = true, show red flame icon
- Score badge: color coded
  - 70–100: green circle with score
  - 40–69: amber circle with score
  - 0–39: grey circle with score

**Middle row:**
- Inquiry type badge: "Buy" (blue) or "Rent" (green)
- Property type + bedrooms: "2BHK Apartment"
- Preferred area

**Budget row:**
- ₹X,XX,XXX – ₹Y,YY,YYY
- If no budget: show "Budget not specified" in grey

**Bottom row:**
- Source icon + label (WhatsApp, website, portal etc)
- Time in current stage: "In Negotiating for 3 days"
- Follow-up day indicator: "Follow-up Day 2 of 4"
- Next follow-up date if scheduled

**Action buttons (shown at bottom of card):**
Buttons change based on current stage — see stage-specific buttons below.

---

## STAGE-SPECIFIC BUTTONS

### Stage: new
- **Move to Qualified** button (blue)
  - On click: call n8n stage webhook with new_stage = 'qualified'
  - On success: move card to Qualified column

### Stage: qualified
- **Schedule Viewing** button (blue)
  - On click: show date+time picker
  - On confirm: call stage webhook with new_stage = 'viewing_scheduled' + viewing_date
- **Move to Lost** button (grey outline)

### Stage: viewing_scheduled
- **Mark Viewed** button (blue)
  - On click: call stage webhook with new_stage = 'negotiating'
- **Reschedule** button (amber)
- **Move to Lost** button (grey)

### Stage: negotiating
- **Request Sign-Off** button (purple) ← KEY BUTTON
- **Move to Lost** button (grey)

### Stage: pending_signoff
- **Approve Deal** button (green) — shown only to admin/owner role
- **Send Back** button (amber) — shown only to admin/owner role, returns to negotiating with feedback
- Card shows "Awaiting manager sign-off" banner in purple

### Stage: closed_won
- No action buttons
- Show: closed date, final deal summary if notes exist

### Stage: closed_lost
- **Reopen Lead** button (grey) — returns to 'new' stage

---

## REQUEST SIGN-OFF — EXACT IMPLEMENTATION

```typescript
const handleRequestSignoff = async (lead: Lead) => {
  setLoadingLead(lead.id)

  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_N8N_DEAL_SIGNOFF_WEBHOOK!,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_signoff',
          lead_id: lead.id,
          lead_name: lead.full_name,
          inquiry_type: lead.inquiry_type,
          budget_min: lead.budget_min,
          budget_max: lead.budget_max,
          preferred_area: lead.preferred_area,
          property_type: lead.property_type,
          bedrooms: lead.bedrooms,
          lead_score: lead.lead_score,
          classification: lead.classification,
          score_reason: lead.score_reason,
          notes: lead.notes,
          organization_id: orgId,
          requested_by: currentUser.id,
          requested_by_name: currentUser.full_name,
          requested_at: new Date().toISOString()
        })
      }
    )

    if (!response.ok) throw new Error('Webhook failed')

    // Update stage to pending_signoff
    setLeads(prev =>
      prev.map(l =>
        l.id === lead.id
          ? { ...l, stage: 'pending_signoff' }
          : l
      )
    )

    toast.success('Sign-off requested. Manager has been notified.')

  } catch (error) {
    toast.error('Request failed. Please try again.')
  } finally {
    setLoadingLead(null)
  }
}
```

---

## APPROVE DEAL — EXACT IMPLEMENTATION

Only users with role = 'owner' or 'admin' see this button.

```typescript
const handleApproveDeal = async (lead: Lead) => {
  const confirmed = confirm(
    `Approve deal for ${lead.full_name}?\n\nBudget: ₹${lead.budget_max?.toLocaleString()}\nInquiry: ${lead.inquiry_type}\nArea: ${lead.preferred_area}`
  )
  if (!confirmed) return

  setLoadingLead(lead.id)

  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_N8N_DEAL_SIGNOFF_WEBHOOK!,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approved',
          lead_id: lead.id,
          organization_id: orgId,
          approved_by: currentUser.id,
          approved_by_name: currentUser.full_name,
          approved_at: new Date().toISOString()
        })
      }
    )

    if (!response.ok) throw new Error('Webhook failed')

    setLeads(prev =>
      prev.map(l =>
        l.id === lead.id
          ? { ...l, stage: 'closed_won' }
          : l
      )
    )

    toast.success(`Deal approved for ${lead.full_name}`)

  } catch (error) {
    toast.error('Approval failed. Please try again.')
  } finally {
    setLoadingLead(null)
  }
}
```

---

## SEND BACK — EXACT IMPLEMENTATION

Manager sends deal back to agent with feedback.

On click: show inline form:
- Textarea: "Feedback for agent (required)"
- Confirm Send Back + Cancel buttons

```typescript
const handleSendBack = async (lead: Lead, feedback: string) => {
  if (!feedback.trim()) {
    toast.error('Please enter feedback for the agent')
    return
  }

  setLoadingLead(lead.id)

  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_N8N_DEAL_SIGNOFF_WEBHOOK!,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sent_back',
          lead_id: lead.id,
          feedback,
          organization_id: orgId,
          sent_back_by: currentUser.id,
          sent_back_at: new Date().toISOString()
        })
      }
    )

    if (!response.ok) throw new Error('Webhook failed')

    setLeads(prev =>
      prev.map(l =>
        l.id === lead.id
          ? { ...l, stage: 'negotiating', notes: `Manager feedback: ${feedback}` }
          : l
      )
    )

    toast.success('Deal sent back to agent with feedback.')

  } catch (error) {
    toast.error('Failed. Please try again.')
  } finally {
    setLoadingLead(null)
  }
}
```

---

## STAGE CHANGE BUTTON — GENERIC (for other stage transitions)

All stage transitions that do not have special logic use this:

```typescript
const handleStageChange = async (leadId: string, newStage: string) => {
  setLoadingLead(leadId)

  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_N8N_LEAD_STAGE_WEBHOOK!,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          stage: newStage,
          organization_id: orgId,
          user_id: currentUser.id
        })
      }
    )

    if (!response.ok) throw new Error('Webhook failed')

    setLeads(prev =>
      prev.map(l =>
        l.id === leadId ? { ...l, stage: newStage } : l
      )
    )

  } catch (error) {
    toast.error('Stage update failed. Please try again.')
  } finally {
    setLoadingLead(null)
  }
}
```

---

## ADD LEAD FORM

Slide-in panel from right with fields:

**Required:**
- Full name (text)
- Phone (text)
- Inquiry type (dropdown: buy/rent/sell/invest)
- Source (dropdown: whatsapp/website/portal/referral/social/walk_in)

**Optional:**
- Email
- Budget min (number)
- Budget max (number)
- Preferred area (text)
- Property type (text)
- Bedrooms (number)
- Move-in timeline (dropdown: immediate/1_month/3_months/flexible)
- Notes (textarea)

On submit:
```typescript
const { data: lead } = await supabase
  .from('leads')
  .insert({
    organization_id: orgId,
    ...formData,
    stage: 'new',
    follow_up_day: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .select()
  .single()
```

After insert: the Supabase database webhook automatically triggers W1 Lead Qualification n8n workflow. No additional call needed from frontend.

---

## EXPAND LEAD — FULL DETAIL

Click a card to open a full side panel showing:

**Score section:**
- Score: XX/100 with colored progress bar
- Classification: Hot / Warm / Cold badge
- Score reason: text from score_reason field
- Is hot: flame icon if true

**Contact section:**
- Name, email, phone
- Source badge

**Requirements section:**
- Inquiry type
- Budget range
- Preferred area
- Property type + bedrooms
- Move-in timeline

**Follow-up section:**
- Follow-up day: X of 4
- Last contact: timestamp
- Next follow-up: date or "Not scheduled"
- Follow-up history (from audit_log where action = 'follow_up_sent' and entity_id = lead.id)

**Notes section:**
- Editable textarea
- Auto-saves on blur:
```typescript
await supabase
  .from('leads')
  .update({ notes: newNotes, updated_at: new Date().toISOString() })
  .eq('id', lead.id)
```

**Qualification answers section:**
- If qualification_answers JSONB is not null, show each Q&A pair

---

## LIST VIEW

Toggle from Kanban to see all leads in a table.

Columns: Name | Score | Inquiry | Budget | Area | Source | Stage | Follow-up Day | Last Contact | Actions

Sortable by: Score (default desc), Created date, Stage, Budget

Same action buttons as Kanban but in a compact dropdown menu per row.

---

## ROLE-BASED VISIBILITY

Check current user role from team_members table:

```typescript
const { data: member } = await supabase
  .from('team_members')
  .select('role')
  .eq('user_id', currentUser.id)
  .eq('organization_id', orgId)
  .single()

const isManager = ['owner', 'admin', 'manager'].includes(member?.role)
```

- Approve Deal button: only show if isManager = true
- Send Back button: only show if isManager = true
- Request Sign-Off button: show to all roles
- Add Lead: show to all except viewer
- Delete Lead: show to owner/admin only

---

## WHAT HAPPENS IN n8n AFTER SIGN-OFF WEBHOOKS

**W3_LeadStageUpdate** (for all stage changes):
1. Updates leads table stage field
2. If closed_won: sends congratulations Gmail to agent, stops follow-up sequence
3. If closed_lost: stops follow-up sequence (follow_up_day = 99)
4. Logs to audit_log

**W_DealSignoff** (for sign-off specific actions):
- request_signoff: sends Gmail to manager with full lead summary and approve/reject links
- approved: updates stage to closed_won, sends Gmail to agent with approval confirmation
- sent_back: updates stage to negotiating, updates notes with feedback, sends Gmail to agent with manager feedback

---

## LEADS TABLE — SCHEMA (reference)

```sql
- id (UUID)
- organization_id (UUID)
- full_name (TEXT)
- email (TEXT)
- phone (TEXT)
- source (TEXT)
- inquiry_type (TEXT) — buy|rent|sell|invest
- budget_min (NUMERIC)
- budget_max (NUMERIC)
- preferred_area (TEXT)
- property_type (TEXT)
- bedrooms (INT)
- move_in_timeline (TEXT)
- lead_score (INT) — 0-100
- classification (TEXT) — hot|warm|cold
- is_hot (BOOLEAN)
- score_reason (TEXT)
- stage (TEXT) — new|qualified|viewing_scheduled|negotiating|pending_signoff|closed_won|closed_lost
- follow_up_day (INT) — 0-4
- last_contact_at (TIMESTAMPTZ)
- next_follow_up_at (TIMESTAMPTZ)
- qualification_answers (JSONB)
- notes (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

---

## ENVIRONMENT VARIABLES NEEDED

```
NEXT_PUBLIC_N8N_LEAD_STAGE_WEBHOOK=https://your-n8n/webhook/propiq-lead-stage
NEXT_PUBLIC_N8N_DEAL_SIGNOFF_WEBHOOK=https://your-n8n/webhook/propiq-deal-signoff
```

---

## HOW TO GIVE THIS TO ANTIGRAVITY

Give this file as context. Then say:

"Build the /app/leads page exactly as described in this file. Use the existing supabase client and design system. Build in this order: 1) Stats row with 4 cards from Supabase, 2) Kanban board with 7 columns, 3) Lead cards with all fields shown, 4) Stage-specific buttons that change based on the lead stage, 5) Request Sign-Off button with exact implementation, 6) Approve Deal and Send Back buttons visible only to owner and admin roles, 7) Expand lead panel with full details and editable notes, 8) Add Lead form as slide-in panel, 9) List view as alternative layout. Check user role from team_members table to control which buttons are visible."