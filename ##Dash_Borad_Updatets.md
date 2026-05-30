# PropIQ — Dashboard Updates
# Route: /app/dashboard
# File: frontend/app/app/dashboard/page.tsx
# Tables: properties, units, leases, leads, maintenance_tickets, invoices, alerts, audit_log, rent_payments

---

## WHAT THIS PAGE IS

The first screen every user sees after login. Shows the complete health of the property portfolio at a glance. All numbers are live from Supabase. No manual compilation. No stale data. Updates in real time via Supabase Realtime subscriptions.

---

## FULL PAGE LAYOUT

```
[Header: Dashboard | Portfolio overview | Quick action buttons]
[KPI Cards Row — 5 cards]
[Alert Banner — if critical items exist]
[Two column layout below:]
  [Left 60%: Recent Activity Feed]
  [Right 40%: Pending Approvals Summary]
[Lead Pipeline Status]
[Expiry Timeline Chart]
```

---

## HEADER ROW

- Title: **Dashboard**
- Subtitle: **Portfolio overview and real-time activity**
- Three quick action buttons on the right:
  - **+ Add Property** → navigates to /app/properties with add form open
  - **Upload Lease** → navigates to /app/leases with upload panel open
  - **Ask AI** → navigates to /app/search

---

## KPI CARDS ROW — 5 CARDS

All 5 queries run in parallel using Promise.all on page load.

### Card 1 — Total Units

```typescript
const { count: totalUnits } = await supabase
  .from('units')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', orgId)

const { count: occupiedUnits } = await supabase
  .from('units')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', orgId)
  .eq('status', 'occupied')

const vacantUnits = totalUnits - occupiedUnits
const occupancyRate = totalUnits > 0
  ? Math.round((occupiedUnits / totalUnits) * 100)
  : 0
```

Card displays:
- Large number: totalUnits
- Sub-line: "Occ: [occupiedUnits] | Vac: [vacantUnits]"
- Progress bar showing occupancy rate percentage
- Label: "Total Units"

### Card 2 — Expiring Leases

```typescript
const { count: expiringLeases } = await supabase
  .from('leases')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', orgId)
  .eq('lease_status', 'active')
  .lte('expiry_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
```

Card displays:
- Large number: expiringLeases
- Sub-line: "Next 90 Days"
- If count > 0: amber border on card
- If any expiring in < 30 days: red border + red dot
- Label: "Expiring Leases"
- Click: navigates to /app/leases filtered to expiring

### Card 3 — Open Tickets

```typescript
const { data: ticketStats } = await supabase
  .from('maintenance_tickets')
  .select('priority')
  .eq('organization_id', orgId)
  .in('status', ['open', 'assigned', 'quoted', 'in_progress'])

const totalOpen = ticketStats?.length || 0
const highPriority = ticketStats?.filter(t =>
  t.priority === 'urgent' || t.priority === 'high'
).length || 0
```

Card displays:
- Large number: totalOpen
- Sub-line: "[highPriority] High Priority"
- If highPriority > 0: amber border
- Label: "Open Tickets"
- Click: navigates to /app/maintenance

### Card 4 — Monthly Collections

```typescript
const startOfMonth = new Date()
startOfMonth.setDate(1)
startOfMonth.setHours(0, 0, 0, 0)

const { data: payments } = await supabase
  .from('rent_payments')
  .select('amount_due, amount_paid, status')
  .eq('organization_id', orgId)
  .gte('due_date', startOfMonth.toISOString().split('T')[0])
  .lte('due_date', new Date().toISOString().split('T')[0])

const totalDue = payments?.reduce((s, p) => s + (p.amount_due || 0), 0) || 0
const totalPaid = payments?.reduce((s, p) => s + (p.amount_paid || 0), 0) || 0
const collectionRate = totalDue > 0
  ? Math.round((totalPaid / totalDue) * 100)
  : 0
```

Card displays:
- Large number: ₹[totalPaid formatted]
- Sub-line: "[collectionRate]% of ₹[totalDue formatted] target"
- Progress bar showing collection rate
- If collectionRate < 80: amber border
- Label: "Monthly Collections"
- Click: navigates to /app/analytics

### Card 5 — Pending Approvals ← NEW CARD

```typescript
const [invoiceCount, leaseCount, maintenanceCount, signoffCount] = await Promise.all([
  supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .in('status', ['received', 'matched', 'flagged']),

  supabase
    .from('leases')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('lease_status', 'active')
    .lte('expiry_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .is('renewal_status', null),

  supabase
    .from('maintenance_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'quoted')
    .not('actual_cost', 'is', null),

  supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('stage', 'pending_signoff')
])

const totalPending =
  (invoiceCount.count || 0) +
  (leaseCount.count || 0) +
  (maintenanceCount.count || 0) +
  (signoffCount.count || 0)
```

Card displays:
- Large number: totalPending
- Sub-line: breakdown on hover or below number:
  - "Invoices: [n] | Renewals: [n] | Quotes: [n] | Sign-offs: [n]"
- If totalPending > 0: amber border + amber dot on card
- If totalPending > 10: red border
- Label: "Pending Approvals"
- Click: navigates to /app/approvals

---

## ALERT BANNER

Show below KPI cards only when critical conditions exist.

Check these conditions:

```typescript
const criticalLeases = await supabase
  .from('leases')
  .select('id', { count: 'exact', head: true })
  .eq('organization_id', orgId)
  .eq('lease_status', 'active')
  .lte('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

const overdueApprovals = await supabase
  .from('invoices')
  .select('id', { count: 'exact', head: true })
  .eq('organization_id', orgId)
  .in('status', ['received', 'matched'])
  .lte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
```

If criticalLeases.count > 0:
Show red banner: "🚨 [N] lease(s) expire within 30 days. Immediate renewal action required."
With button: "View Expiring Leases" → /app/leases filtered

If overdueApprovals.count > 0:
Show amber banner: "⚠️ [N] invoice(s) have been awaiting approval for over 48 hours."
With button: "Review Invoices" → /app/approvals

Banners are dismissible (X button) per session only — they come back on next page load.

---

## RECENT ACTIVITY FEED

Left column (60% width). Shows last 15 audit_log entries.

```typescript
const { data: activities } = await supabase
  .from('audit_log')
  .select(`
    id,
    action,
    entity_type,
    entity_id,
    new_values,
    created_at,
    user_id
  `)
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })
  .limit(15)
```

Each activity item shows:
- Icon based on action type:
  - lease_ingested: document icon
  - lead_scored: star icon
  - follow_up_sent: mail icon
  - lead_stage_updated: arrow icon
  - maintenance approved: check icon
  - invoice_approved: check-circle icon
- Description text generated from action + entity_type:
  - "lead_scored" → "Lead [name] scored [score]/100 ([classification])"
  - "follow_up_sent" → "Follow-up Day [n] sent to [email]"
  - "lead_stage_updated" → "Lead [name] moved to [new_stage]"
  - "lease_ingested" → "Lease document indexed successfully"
  - "invoice_approved" → "Invoice ₹[amount] approved"
- Timestamp: "2 hours ago", "yesterday", "3 days ago"
- Click: navigates to the relevant entity page

Show "View All Activity" link at bottom → navigates to a full activity log page.

Subscribe to realtime on audit_log table filtered by organization_id. New activities appear at top of feed without page refresh.

---

## PENDING APPROVALS SUMMARY

Right column (40% width). Mini version of the Approvals page.

Shows 4 sections stacked vertically:

**Invoices Pending (N)**
Show first 3 pending invoices:
- Vendor name + amount
- Waiting time
- If overdue: red dot

**Lease Renewals (N)**
Show first 3 leases needing renewal:
- Tenant name + unit
- Days until expiry

**Maintenance Quotes (N)**
Show first 3 quotes needing approval:
- Issue title
- Quoted amount

**Deal Sign-offs (N)**
Show first 3 leads pending sign-off:
- Lead name + score

Each section has a "Review All →" link going to /app/approvals with that tab active.

If a section has 0 items: show "✓ All clear" in green.

---

## LEAD PIPELINE STATUS

Below the two columns. Full-width horizontal bar.

Shows 5 stages as a funnel:

```typescript
const { data: stageCounts } = await supabase
  .from('leads')
  .select('stage')
  .eq('organization_id', orgId)
  .not('stage', 'in', '("closed_won","closed_lost")')
```

Group by stage and show counts:
- New: [count]
- Qualified: [count]
- Viewing Scheduled: [count]
- Negotiating: [count]
- Pending Sign-off: [count]

Each stage is a pill/block. Width proportional to count. Click on any stage navigates to /app/leads with that stage filtered.

---

## EXPIRY TIMELINE

Below lead pipeline. Shows a 12-month view of lease expirations.

```typescript
const { data: leaseExpiries } = await supabase
  .from('leases')
  .select('expiry_date')
  .eq('organization_id', orgId)
  .eq('lease_status', 'active')
  .gte('expiry_date', new Date().toISOString().split('T')[0])
  .lte('expiry_date', new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
```

Group by month. Show as simple bar chart — each bar is a month, height = number of leases expiring that month.

Label: "Lease Expiry Timeline — Next 12 Months"

If a month has 5+ leases expiring: bar is red. 3-4: amber. 1-2: green.

Use recharts library which is available in the project.

---

## LOADING STATES

All 5 KPI cards must show skeleton loaders while data fetches. Do NOT show 0 or placeholder values. Show animated grey skeleton boxes.

Use this pattern:
```tsx
{isLoading ? (
  <div className="skeleton-card" />
) : (
  <KPICard value={totalUnits} label="Total Units" />
)}
```

---

## REALTIME SUBSCRIPTIONS

On page mount, subscribe to changes on these tables:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('dashboard-realtime')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'audit_log',
      filter: `organization_id=eq.${orgId}`
    }, (payload) => {
      // Prepend new activity to feed
      setActivities(prev => [payload.new, ...prev].slice(0, 15))
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'invoices',
      filter: `organization_id=eq.${orgId}`
    }, () => refetchApprovalCounts())
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'leads',
      filter: `organization_id=eq.${orgId}`
    }, () => {
      refetchLeadPipeline()
      refetchApprovalCounts()
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [orgId])
```

---

## ALL QUERIES RUN IN PARALLEL

Do NOT chain queries sequentially. Run all at once:

```typescript
const [
  unitStats,
  expiringCount,
  ticketStats,
  paymentStats,
  approvalCounts,
  activities,
  stageCounts,
  leaseExpiries,
  criticalLeases,
  overdueApprovals
] = await Promise.all([
  fetchUnitStats(),
  fetchExpiringLeases(),
  fetchTicketStats(),
  fetchPaymentStats(),
  fetchApprovalCounts(),
  fetchActivities(),
  fetchStageCounts(),
  fetchLeaseExpiries(),
  fetchCriticalLeases(),
  fetchOverdueApprovals()
])
```

This means the page loads in one round-trip instead of 10.

---

## SIDEBAR — APPROVALS BADGE

The sidebar navigation item for Approvals should show a red badge with the pending approval count:

```tsx
<SidebarItem
  href="/app/approvals"
  icon={<CheckSquare />}
  label="Approvals"
  badge={totalPending > 0 ? totalPending : null}
  badgeColor="red"
/>
```

Fetch this count once on app layout load and store in a shared state/context so all pages can access it. Refresh every 5 minutes or when a realtime event fires on any approval-related table.

---

## ENVIRONMENT VARIABLES NEEDED

No new webhooks for dashboard. All data comes directly from Supabase.

Existing variables used:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## HOW TO GIVE THIS TO ANTIGRAVITY

Give this file as context. Then say:

"Update the /app/dashboard page exactly as described in this file. Use the existing supabase client from lib/supabase.ts and the existing design system. Build in this order: 1) Run ALL Supabase queries in parallel using Promise.all — never chain them sequentially, 2) Show skeleton loaders while data loads, 3) KPI cards row with all 5 cards including the new Pending Approvals card, 4) Alert banners for critical conditions, 5) Two-column layout with Recent Activity feed on left and Pending Approvals summary on right, 6) Lead Pipeline status bar, 7) Lease Expiry timeline using recharts, 8) Realtime subscriptions that update the feed without page refresh, 9) Sidebar badge showing pending approval count. The Pending Approvals card should have an amber border when count > 0 and red border when count > 10."