# PropIQ — Approvals Page
# Route: /app/approvals
# File: frontend/app/app/approvals/page.tsx

---

## WHAT THIS PAGE IS

A single unified page where property managers see every pending approval across the entire business in one place. Nothing gets lost in email or WhatsApp. Every approval has a timer showing how long it has been waiting. Every action is logged.

---

## PAGE LAYOUT

### Top Bar
- Page title: **Approvals**
- Subtitle: **All pending actions requiring your decision**
- A summary row showing 4 numbers side by side:
  - Pending Invoices: [count]
  - Lease Renewals Due: [count]
  - Maintenance Quotes: [count]
  - Deal Sign-offs: [count]
- Each number pulls from Supabase on page load

### Four Tabs
Tabs sit below the summary row. Tabs are:
1. **Invoices** (default active tab)
2. **Lease Renewals**
3. **Maintenance Quotes**
4. **Deal Sign-offs**

Clicking a tab shows that section. Other sections hide. Active tab has an underline indicator.

### Each Tab Section
Has two sub-sections:
- **Pending** — items waiting for action (shown first, sorted by oldest first)
- **History** — items already approved or rejected (collapsed by default, expandable)

---

## TAB 1 — INVOICES

### Data Source
Query Supabase `invoices` table:
```
SELECT
  i.id,
  i.vendor_name,
  i.invoice_number,
  i.invoice_date,
  i.total_amount,
  i.gst_amount,
  i.status,
  i.is_anomaly,
  i.anomaly_reason,
  i.is_duplicate,
  i.work_order_amount,
  i.amount_deviation,
  i.file_path,
  i.created_at,
  v.name as vendor_full_name,
  v.phone as vendor_phone,
  mt.title as maintenance_title,
  p.name as property_name
FROM invoices i
LEFT JOIN vendors v ON v.id = i.vendor_id
LEFT JOIN maintenance_tickets mt ON mt.id = i.maintenance_id
LEFT JOIN properties p ON p.id = i.property_id
WHERE i.organization_id = [current_org_id]
AND i.status IN ('received', 'matched', 'flagged')
ORDER BY i.created_at ASC
```

### Each Invoice Row Shows
- Vendor name (bold)
- Invoice number
- Invoice date
- Total amount (formatted as ₹X,XX,XXX)
- Property name
- Linked maintenance ticket title (if exists)
- Status badge: green = matched, amber = received, red = flagged
- If is_anomaly = true: show red warning icon + anomaly_reason text
- If is_duplicate = true: show orange warning icon + "Possible duplicate"
- Time waiting: calculate NOW() - created_at, show as "2 hours ago" or "3 days ago"
- If waiting > 24 hours: show amber "Overdue" badge
- If waiting > 48 hours: show red "Critical" badge

### Buttons on Each Invoice Row
**Approve button (green)**
- On click: call n8n webhook
- Webhook URL: process.env.NEXT_PUBLIC_N8N_INVOICE_APPROVE_WEBHOOK
- Payload:
```json
{
  "action": "approved",
  "invoice_id": "[invoice.id]",
  "organization_id": "[org_id]",
  "approved_by": "[current_user_id]",
  "approved_at": "[ISO timestamp]"
}
```
- On success: update invoice row status to 'approved' in UI immediately, move row to History section, show green toast "Invoice approved successfully"
- On error: show red toast "Approval failed. Please try again."

**Reject button (red)**
- On click: show small inline form below the row with:
  - Text input: "Reason for rejection"
  - Confirm Reject button
  - Cancel button
- On confirm: call same webhook with:
```json
{
  "action": "rejected",
  "invoice_id": "[invoice.id]",
  "organization_id": "[org_id]",
  "rejected_by": "[current_user_id]",
  "rejection_reason": "[text input value]",
  "rejected_at": "[ISO timestamp]"
}
```
- On success: update row status to 'rejected', move to History, show red toast "Invoice rejected"

**View Invoice button (grey)**
- Opens invoice PDF in a side panel or new tab
- URL: fetch from Supabase Storage using file_path

### History Section (Invoices)
- Collapsed by default
- Click "Show History" to expand
- Same query but status IN ('approved', 'rejected', 'paid')
- Same columns but no action buttons
- Shows who approved/rejected and when
- Shows approved_by name and approved_at timestamp

---

## TAB 2 — LEASE RENEWALS

### Data Source
Query Supabase `leases` table:
```
SELECT
  l.id,
  l.unit_id,
  l.tenant_name,
  l.tenant_email,
  l.tenant_phone,
  l.start_date,
  l.expiry_date,
  l.rent_amount,
  l.lease_status,
  l.renewal_status,
  l.file_path,
  l.created_at,
  u.unit_number,
  p.name as property_name,
  p.city
FROM leases l
LEFT JOIN units u ON u.id = l.unit_id
LEFT JOIN properties p ON p.id = u.property_id
WHERE l.organization_id = [current_org_id]
AND l.lease_status = 'active'
AND l.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
AND l.renewal_status IS NULL OR l.renewal_status = 'pending'
ORDER BY l.expiry_date ASC
```

### Each Lease Renewal Row Shows
- Tenant name (bold)
- Unit number and property name
- Expiry date (formatted as DD MMM YYYY)
- Days until expiry: calculate expiry_date - TODAY, show as "23 days remaining"
- Color code urgency:
  - Red: less than 30 days
  - Amber: 30 to 60 days
  - Green: 60 to 90 days
- Current rent amount
- Renewal status badge: grey = not started, amber = pending, green = offered
- Time since lease was created

### Buttons on Each Lease Row
**Send Renewal Offer button (blue)**
- Only shown when renewal_status IS NULL
- On click: call n8n webhook
- Webhook URL: process.env.NEXT_PUBLIC_N8N_LEASE_RENEWAL_WEBHOOK
- Payload:
```json
{
  "action": "send_renewal_offer",
  "lease_id": "[lease.id]",
  "tenant_name": "[lease.tenant_name]",
  "tenant_email": "[lease.tenant_email]",
  "unit_id": "[lease.unit_id]",
  "expiry_date": "[lease.expiry_date]",
  "current_rent": "[lease.rent_amount]",
  "organization_id": "[org_id]"
}
```
- On success: update renewal_status to 'offered' in UI, change button to "Offer Sent", show blue toast "Renewal offer sent to tenant"
- On error: show red toast "Failed to send offer"

**Mark Renewed button (green)**
- Only shown when renewal_status = 'offered'
- On click: show confirmation dialog "Confirm lease has been renewed?"
- On confirm: call same webhook with action = "mark_renewed"
- On success: update lease_status to indicate renewal, remove from pending list, show toast

**Skip button (grey)**
- On click: show confirmation "Mark this lease as not renewing?"
- On confirm: update renewal_status = 'declined' in Supabase directly
- Remove from pending list

---

## TAB 3 — MAINTENANCE QUOTES

### Data Source
Query Supabase `maintenance_tickets` table:
```
SELECT
  mt.id,
  mt.title,
  mt.description,
  mt.category,
  mt.priority,
  mt.status,
  mt.estimated_cost,
  mt.actual_cost,
  mt.created_at,
  mt.assigned_at,
  u.unit_number,
  p.name as property_name,
  v.name as vendor_name,
  v.phone as vendor_phone,
  v.rating as vendor_rating
FROM maintenance_tickets mt
LEFT JOIN units u ON u.id = mt.unit_id
LEFT JOIN properties p ON p.id = mt.property_id
LEFT JOIN vendors v ON v.id = mt.vendor_id
WHERE mt.organization_id = [current_org_id]
AND mt.status = 'quoted'
AND mt.actual_cost IS NOT NULL
ORDER BY mt.priority DESC, mt.created_at ASC
```

### Each Maintenance Quote Row Shows
- Issue title (bold)
- Property name and unit number
- Category badge (plumbing, electrical etc)
- Priority badge: red = urgent, amber = high, grey = medium/low
- Vendor name and rating (stars)
- Estimated cost vs Quoted cost:
  - Show both side by side
  - If quoted > estimated by more than 20%: show red warning "Quote exceeds estimate by X%"
  - If quoted within 10% of estimated: show green "Within budget"
- Time waiting for approval
- Overdue/Critical badges same as invoices

### Buttons on Each Quote Row
**Approve Quote button (green)**
- On click: call n8n webhook
- Webhook URL: process.env.NEXT_PUBLIC_N8N_MAINTENANCE_APPROVE_WEBHOOK
- Payload:
```json
{
  "action": "approved",
  "ticket_id": "[ticket.id]",
  "vendor_id": "[ticket.vendor_id]",
  "approved_cost": "[ticket.actual_cost]",
  "organization_id": "[org_id]",
  "approved_by": "[current_user_id]",
  "approved_at": "[ISO timestamp]"
}
```
- On success: update ticket status to 'in_progress' in UI, move to History, show toast

**Reject Quote button (red)**
- Same inline rejection form as invoices
- On confirm: call webhook with action = "rejected" + reason
- On success: update status to 'open' (vendor needs to requote), show toast

**Request Requote button (amber)**
- Shows when quote is significantly over estimated cost
- On click: call webhook with action = "request_requote" + note
- On success: status returns to 'assigned', vendor gets notified

---

## TAB 4 — DEAL SIGN-OFFS

### Data Source
Query Supabase `leads` table:
```
SELECT
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
  stage,
  notes,
  created_at,
  last_contact_at
FROM leads
WHERE organization_id = [current_org_id]
AND stage IN ('negotiating', 'pending_signoff')
ORDER BY lead_score DESC, created_at ASC
```

### Each Deal Row Shows
- Lead name (bold)
- Inquiry type badge (Buy / Rent)
- Lead score badge (color coded: green 70+, amber 40-69, red below 40)
- Budget range
- Preferred area and property type
- Time in negotiating stage
- Last contact date

### Buttons on Each Deal Row
**Request Sign-Off button (blue)**
- Only shown when stage = 'negotiating'
- On click: call n8n webhook
- Webhook URL: process.env.NEXT_PUBLIC_N8N_DEAL_SIGNOFF_WEBHOOK
- Payload:
```json
{
  "action": "request_signoff",
  "lead_id": "[lead.id]",
  "lead_name": "[lead.full_name]",
  "inquiry_type": "[lead.inquiry_type]",
  "budget_max": "[lead.budget_max]",
  "preferred_area": "[lead.preferred_area]",
  "lead_score": "[lead.lead_score]",
  "organization_id": "[org_id]",
  "requested_by": "[current_user_id]"
}
```
- On success: update stage to 'pending_signoff' in UI, change button to "Sign-off Requested", show toast

**Approve Deal button (green)**
- Only shown when stage = 'pending_signoff'
- On click: confirmation dialog "Confirm deal approval?"
- On confirm: call webhook with action = "approved"
- On success: update stage to 'closed_won', remove from list, show green toast

**Reject Deal button (red)**
- Same inline rejection form
- On confirm: call webhook with action = "rejected" + reason
- On success: update stage to 'negotiating', show toast

---

## SIDEBAR NAVIGATION UPDATE

Add Approvals to sidebar in this exact position:
```
Dashboard
Properties
Leases
Tenants
Leads
Maintenance
Documents
AI Search
Analytics
Invoices
→ Approvals   ← ADD HERE
Alerts
Integrations
Settings
```

Icon to use: CheckSquare or ClipboardCheck from lucide-react

Show a red dot badge on the sidebar Approvals link when there are any pending approvals. Count comes from the same summary query on page load.

---

## SUPABASE REALTIME SUBSCRIPTION

On page mount, subscribe to realtime changes on invoices, maintenance_tickets, and leads tables filtered by organization_id. When any row changes, re-fetch the affected tab data automatically. This means if another team member approves something on their device, the current user's screen updates without refresh.

```typescript
const channel = supabase
  .channel('approvals-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'invoices',
    filter: `organization_id=eq.${orgId}`
  }, () => refetchInvoices())
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'maintenance_tickets',
    filter: `organization_id=eq.${orgId}`
  }, () => refetchTickets())
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'leads',
    filter: `organization_id=eq.${orgId}`
  }, () => refetchLeads())
  .subscribe()
```

Unsubscribe on page unmount.

---

## LOADING STATES

- On initial page load: show skeleton cards for each tab section
- On approve/reject button click: disable both buttons, show spinner on clicked button
- After action completes: re-enable buttons (they will not show for the moved row anyway)
- Never show a blank page — always show skeleton while loading

---

## ERROR STATES

- If Supabase query fails: show "Unable to load approvals. Try refreshing." with a Retry button
- If webhook call fails: show red toast with error message, do NOT update the UI row (leave it in pending state)
- If no pending items in a tab: show empty state message "No pending [invoices/renewals/quotes/sign-offs]" with a checkmark icon

---

## ENVIRONMENT VARIABLES NEEDED

Add these to .env.local in Antigravity:
```
NEXT_PUBLIC_N8N_INVOICE_APPROVE_WEBHOOK=https://your-n8n.com/webhook/propiq-invoice-approval
NEXT_PUBLIC_N8N_LEASE_RENEWAL_WEBHOOK=https://your-n8n.com/webhook/propiq-lease-renewal
NEXT_PUBLIC_N8N_MAINTENANCE_APPROVE_WEBHOOK=https://your-n8n.com/webhook/propiq-maintenance-approval
NEXT_PUBLIC_N8N_DEAL_SIGNOFF_WEBHOOK=https://your-n8n.com/webhook/propiq-deal-signoff
```

---

## HOW TO GIVE THIS TO ANTIGRAVITY

Give this entire file as context. Then say:

"Build the /app/approvals page exactly as described in this file. Use the existing design system from globals.css. Use the existing supabase client from lib/supabase.ts. Read all the data from Supabase using the exact queries shown. Call the n8n webhooks using fetch() with the exact payloads shown. Do not use any mock data. Start with the page shell and the four tabs, then add the Invoices tab data and buttons first, then the other three tabs."