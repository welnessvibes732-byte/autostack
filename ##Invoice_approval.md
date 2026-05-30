# PropIQ — Invoice Approval System
# Touches: /app/invoices, /app/approvals (Tab 1)
# Tables: invoices, vendors, maintenance_tickets, audit_log

---

## WHAT THIS SOLVES

Currently invoices arrive by email or are uploaded manually. Someone reads the PDF, checks the amount, emails back approval, and eventually processes payment. This takes 8 to 12 minutes per invoice. With 300 to 400 invoices per month, that is 40 to 80 hours of manual work.

PropIQ replaces this entire flow. Invoice arrives, AI extracts data, matches work order, flags anomalies, routes for one-click approval. The property manager clicks Approve on their screen, done.

---

## INVOICES PAGE — /app/invoices

### Full Page Structure

**Header row:**
- Title: Invoices
- Button: Upload Invoice (opens file picker)
- Filter bar: Status dropdown (All / Received / Matched / Flagged / Approved / Rejected / Paid), Date range picker, Property selector

**Stats row (4 cards):**
- Total This Month: sum of total_amount where paid_date in current month
- Pending Approval: count where status IN ('received', 'matched', 'flagged')
- Anomalies Flagged: count where is_anomaly = true AND status NOT IN ('approved','rejected')
- Overdue (>24hrs): count where status IN ('received','matched','flagged') AND created_at < NOW() - INTERVAL '24 hours'

**Main table:**
Columns: Vendor | Invoice No. | Date | Property | Amount | Status | Flags | Waiting | Actions

**Pagination:** 20 rows per page

---

## SUPABASE QUERY FOR INVOICES PAGE

```typescript
const { data: invoices } = await supabase
  .from('invoices')
  .select(`
    id,
    vendor_name,
    invoice_number,
    invoice_date,
    total_amount,
    gst_amount,
    subtotal,
    line_items,
    status,
    is_anomaly,
    anomaly_reason,
    is_duplicate,
    work_order_amount,
    amount_deviation,
    file_path,
    created_at,
    approved_by,
    approved_at,
    payment_date,
    vendors ( name, phone, rating ),
    maintenance_tickets ( title, category ),
    properties ( name, city )
  `)
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })
```

---

## UPLOAD INVOICE BUTTON

On click: open native file picker (PDF, JPG, PNG accepted)
On file selected:
1. Upload file to Supabase Storage bucket 'invoices' at path: `{orgId}/invoices/{timestamp}_{filename}`
2. Insert row into invoices table:
```typescript
await supabase.from('invoices').insert({
  organization_id: orgId,
  file_path: uploadedPath,
  status: 'received',
  created_at: new Date().toISOString()
})
```
3. Call n8n ingestion webhook:
```typescript
await fetch(process.env.NEXT_PUBLIC_N8N_INVOICE_INGEST_WEBHOOK, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    file_path: uploadedPath,
    organization_id: orgId,
    uploaded_by: currentUserId
  })
})
```
4. Show toast: "Invoice uploaded. Processing started — this takes about 30 seconds."
5. Subscribe to realtime on that invoice row. When status changes from 'received' to 'matched' or 'flagged', show updated status without page refresh.

---

## INVOICE ROW — FULL DETAIL

Each row in the table shows:

**Vendor name** — from vendor_name field or vendors.name if vendor_id linked
**Invoice number** — invoice_number field
**Invoice date** — formatted DD MMM YYYY
**Property** — properties.name + properties.city
**Amount** — total_amount formatted as ₹X,XX,XXX
**Status badge:**
  - received: grey badge
  - matched: green badge "Matched"
  - flagged: red badge "Flagged"
  - approved: green badge "Approved"
  - rejected: red badge "Rejected"
  - paid: blue badge "Paid"

**Flag icons (show if applicable):**
- Red warning triangle: is_anomaly = true. Hover shows anomaly_reason text.
- Orange duplicate icon: is_duplicate = true. Hover shows "Possible duplicate invoice"
- Amount deviation: if amount_deviation > 10%, show "Quote: ₹X | Invoice: ₹Y (+Z%)"

**Waiting time:**
- Calculate: NOW() - created_at
- Show as: "2 hours ago", "1 day ago", "3 days ago"
- If > 24 hours AND status pending: show amber "Overdue" pill
- If > 48 hours AND status pending: show red "Critical" pill

---

## EXPAND ROW — INVOICE DETAIL

Clicking anywhere on a row (except buttons) expands it to show:
- PDF preview (iframe or image) pulled from Supabase Storage
- Extracted line items table: Description | Qty | Unit Price | Total
- GST breakdown
- Work order details (if matched): title, estimated_cost, actual vs quoted comparison
- Anomaly explanation (if flagged): full anomaly_reason text
- Vendor details: name, phone, rating, past invoices count

---

## APPROVE BUTTON — EXACT IMPLEMENTATION

```typescript
const handleApprove = async (invoiceId: string) => {
  // 1. Disable buttons immediately
  setLoadingInvoice(invoiceId)

  try {
    // 2. Call n8n webhook
    const response = await fetch(
      process.env.NEXT_PUBLIC_N8N_INVOICE_APPROVE_WEBHOOK!,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approved',
          invoice_id: invoiceId,
          organization_id: orgId,
          approved_by: currentUser.id,
          approved_at: new Date().toISOString()
        })
      }
    )

    if (!response.ok) throw new Error('Webhook failed')

    // 3. Update local state immediately (optimistic update)
    setInvoices(prev =>
      prev.map(inv =>
        inv.id === invoiceId
          ? { ...inv, status: 'approved', approved_by: currentUser.id, approved_at: new Date().toISOString() }
          : inv
      )
    )

    // 4. Show success toast
    toast.success('Invoice approved successfully')

  } catch (error) {
    // 5. On error — revert UI, show error
    toast.error('Approval failed. Please try again.')
  } finally {
    setLoadingInvoice(null)
  }
}
```

---

## REJECT BUTTON — EXACT IMPLEMENTATION

```typescript
const handleReject = async (invoiceId: string, reason: string) => {
  if (!reason.trim()) {
    toast.error('Please enter a rejection reason')
    return
  }

  setLoadingInvoice(invoiceId)

  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_N8N_INVOICE_APPROVE_WEBHOOK!,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rejected',
          invoice_id: invoiceId,
          organization_id: orgId,
          rejected_by: currentUser.id,
          rejection_reason: reason,
          rejected_at: new Date().toISOString()
        })
      }
    )

    if (!response.ok) throw new Error('Webhook failed')

    setInvoices(prev =>
      prev.map(inv =>
        inv.id === invoiceId
          ? { ...inv, status: 'rejected' }
          : inv
      )
    )

    setRejectingInvoice(null)
    toast.error('Invoice rejected')

  } catch (error) {
    toast.error('Rejection failed. Please try again.')
  } finally {
    setLoadingInvoice(null)
  }
}
```

---

## REJECTION FORM — UI STATE

When reject button is clicked:
1. Set state: `rejectingInvoice = invoiceId`
2. Render inline below the invoice row:
```tsx
{rejectingInvoice === invoice.id && (
  <div className="rejection-form">
    <input
      type="text"
      placeholder="Reason for rejection..."
      value={rejectionReason}
      onChange={(e) => setRejectionReason(e.target.value)}
      autoFocus
    />
    <button onClick={() => handleReject(invoice.id, rejectionReason)}>
      Confirm Reject
    </button>
    <button onClick={() => setRejectingInvoice(null)}>
      Cancel
    </button>
  </div>
)}
```

---

## WHAT HAPPENS AFTER APPROVAL IN n8n

The n8n workflow (W_InvoiceApproval) receives the webhook and does:
1. Updates invoices table: status = 'approved', approved_by, approved_at
2. Sends Gmail to vendor confirming approval
3. Inserts into audit_log
4. If vendor has bank details: queues for payment (updates status = 'paid' after payment reference added)

The n8n workflow (W_InvoiceRejection) does:
1. Updates invoices table: status = 'rejected'
2. Sends Gmail to vendor with rejection reason
3. Inserts into audit_log
4. Updates maintenance_ticket status back to 'assigned' so vendor can requote

---

## INVOICES TABLE — SUPABASE SCHEMA (reference)

```sql
invoices table columns used on this page:
- id (UUID)
- organization_id (UUID)
- vendor_id (UUID → vendors)
- maintenance_id (UUID → maintenance_tickets)
- property_id (UUID → properties)
- vendor_name (TEXT) — extracted from invoice
- invoice_number (TEXT)
- invoice_date (DATE)
- due_date (DATE)
- line_items (JSONB) — [{description, qty, unit_price, total}]
- subtotal (NUMERIC)
- gst_amount (NUMERIC)
- total_amount (NUMERIC)
- work_order_amount (NUMERIC) — from matched ticket
- amount_deviation (NUMERIC) — % difference
- is_anomaly (BOOLEAN)
- anomaly_reason (TEXT)
- is_duplicate (BOOLEAN)
- status (TEXT) — received|matched|flagged|approved|rejected|paid
- file_path (TEXT)
- approved_by (UUID)
- approved_at (TIMESTAMPTZ)
- payment_date (DATE)
- payment_ref (TEXT)
- created_at (TIMESTAMPTZ)
```

---

## ENVIRONMENT VARIABLES NEEDED

```
NEXT_PUBLIC_N8N_INVOICE_APPROVE_WEBHOOK=https://your-n8n/webhook/propiq-invoice-approval
NEXT_PUBLIC_N8N_INVOICE_INGEST_WEBHOOK=https://your-n8n/webhook/propiq-invoice-ingest
```

---

## HOW TO GIVE THIS TO ANTIGRAVITY

Give this file as context. Then say:

"Build the /app/invoices page exactly as described in this file. Use the existing supabase client from lib/supabase.ts and the existing design system. Build in this order: 1) Stats row with 4 cards from Supabase queries, 2) Invoices table with all columns, 3) Upload button with file picker and Storage upload, 4) Expand row detail, 5) Approve button with exact implementation shown, 6) Reject button with inline form. Use optimistic updates — update the UI immediately when an action is taken, do not wait for a database refresh."