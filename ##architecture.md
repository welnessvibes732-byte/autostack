# PropIQ Architecture & Data Flow

## THE CORE IDEA
One user logs in. They belong to one organisation. Everything they see — properties, leases, tenants, leads, documents — belongs only to their organisation. No other organisation can see their data. This is enforced by Row Level Security in Supabase at the database level, not just in the frontend.

## HOW A USER GETS IN
User goes to `/signup`. They enter organisation name, email, password. When they click Sign Up, two things happen simultaneously in Supabase:
First — Supabase Auth creates the user account and returns a user ID.
Second — the app inserts a row into the `organizations` table with their org name, and inserts a row into `team_members` table linking that user ID to that organisation with role owner.
From this point every database query the user makes automatically filters by their `organization_id`. They cannot see anyone else's data because RLS policies check `organization_id` on every single table before returning any row.
When they log in next time at `/login`, Supabase Auth returns a session. The app reads the session, finds their `organization_id` from `team_members`, and loads their dashboard.

## THE DASHBOARD — WHAT IT SHOWS AND WHERE DATA COMES FROM
When the dashboard loads, it fires four Supabase queries in parallel using `Promise.all`:
- **Query 1 → `units` table** — counts total units, how many have status occupied, how many vacant. Shows: Total Units 142, Occ 138, Vac 4
- **Query 2 → `leases` table** — counts rows where `lease_status = active` AND `expiry_date` is within 90 days from today. Shows: Expiring Leases 12, Next 90 Days
- **Query 3 → `maintenance_tickets` table** — counts rows where `status = open`. Also counts where `priority = urgent`. Shows: Open Tickets 8, 3 High Priority
- **Query 4 → `rent_payments` table** — sums `amount_paid` for current month, compares to sum of `amount_due`. Shows: Collections ₹4.2L, 92% of target

Recent Activity comes from `audit_log` table — last 10 rows ordered by `created_at` descending. Every time anything happens in the system, n8n or the app writes a row to `audit_log`. That is how "New Lease Uploaded — 10 mins ago" appears.

## PROPERTIES MODULE
User goes to `/app/properties`. App queries `properties` table filtered by `organization_id`. Shows list of all properties.
User clicks one property → goes to `/app/properties/[id]`. App queries:
- `units` table where `property_id = this property` — shows all units
- `leases` table joined with units — shows current tenants per unit
- `maintenance_tickets` where `property_id = this` — shows history
- `documents` where `property_id = this` — shows all files

User clicks Add Property → form submits directly to Supabase using the JS SDK. Inserts one row into `properties` table. Done. No n8n involved. Pure frontend to Supabase.

## LEASES MODULE
User goes to `/app/leases`. App queries `leases` table. Shows all leases with colour coding — red if expiring in 30 days, amber if 60 days, green if fine.
User uploads a lease PDF → this is where n8n enters for the first time.

**Upload flow:**
1. Frontend sends PDF to Supabase Storage — documents bucket
2. Frontend inserts a row into `documents` table with `index_status = pending`
3. Frontend calls n8n webhook with the file path
4. n8n picks up the file from Supabase Storage
5. n8n sends it to LlamaParse — extracts text from PDF
6. n8n sends text to Gemini — extracts structured metadata (tenant name, start date, expiry date, rent amount, deposit)
7. n8n inserts/updates the `leases` table with extracted data
8. n8n chunks the document text
9. n8n embeds each chunk using Gemini `embedding-001` (768 dimensions)
10. n8n stores vectors in Qdrant collection `document_rag` — each vector carries payload with `lease_id`, `chunk_index`, `authority_level`, `organization_id`
11. n8n updates `documents` table — sets `index_status = indexed`
12. Frontend is watching Supabase Realtime on the `documents` table — when `index_status` changes to indexed, it shows "Lease indexed successfully"

User clicks a lease → sees full details, can click "Ask this lease anything" which opens the AI Search panel pre-filtered to that lease's document ID.

## TENANTS MODULE
User goes to `/app/tenants`. Queries `tenants` table. Shows all tenants.
User clicks one tenant → app queries:
- `leases` where `tenant_id = this` — their lease history
- `rent_payments` where `tenant_id = this` — payment history
- `maintenance_tickets` where `tenant_id = this` — requests they submitted
- `documents` where `tenant_id = this` — their ID, bank statements

All reads go directly frontend → Supabase SDK. No n8n needed for reading.
Adding a tenant inserts into `tenants` table directly. When a lease is created and linked to a tenant, the `units` table row for that unit gets updated — status changes from vacant to occupied.

## LEADS MODULE
This is the most automated module. It works in two directions — inbound from WhatsApp and outbound follow-ups.

**Inbound flow:**
Someone messages your WhatsApp Business number. WhatsApp sends a webhook to n8n. n8n extracts the phone number, message content, and timestamp. n8n inserts a row into `leads` table with `stage = new`, `source = whatsapp`. n8n immediately sends an automated reply — acknowledgement + 3 qualification questions. n8n stores the WhatsApp conversation in `leads.whatsapp_thread` as JSONB.
When the lead replies with answers, n8n scores them based on budget, timeline, seriousness. Sets `lead_score` 0–100. If score above 70, sets `is_hot = true` and sends a WhatsApp alert to the assigned agent with full lead summary.

**Frontend view:**
User goes to `/app/leads`. Sees Kanban board. Columns are the stage field values — New, Qualified, Viewing Scheduled, Negotiating, Closed Won, Closed Lost. Cards are draggable. Dragging a card updates `leads.stage` in Supabase directly.

**Follow-up sequences:**
n8n runs a scheduled workflow every morning. It queries `leads` table for rows where stage is not closed AND `next_follow_up_at` is today or past. For each lead, it sends the appropriate day message — Day 1, Day 3, Day 7 — via WhatsApp. Updates `follow_up_day` and `next_follow_up_at` after sending.

## MAINTENANCE MODULE
Tenant submits a request → this can come from WhatsApp, a web form, or the portal. n8n receives it, inserts into `maintenance_tickets` table with `status = open`.
n8n then checks the category field — plumbing, electrical, painting etc. It queries `vendors` table for a vendor whose category array contains this issue type AND `is_blacklisted = false` AND sorted by rating DESC. Assigns the best vendor. Updates ticket with `vendor_id` and `status = assigned`. Sends WhatsApp to the vendor with unit details and issue description.
n8n runs a follow-up check every 24 hours. Queries tickets where `status = assigned` AND `assigned_at` was more than 24 hours ago. If vendor has not confirmed, sends a chase message and alerts the property manager.
When vendor completes work, they reply to WhatsApp or confirm in the system. n8n updates `status = completed`, records `actual_cost`, and optionally links an `invoice_id`.
All of this is visible in the frontend at `/app/maintenance`. User sees every ticket, its status, which vendor is assigned, how long it has been open.

## DOCUMENTS MODULE
User goes to `/app/documents`. App queries `documents` table. Shows all files filtered by type — Lease, Compliance, Inspection, Invoice, Report.
Two types of documents are indexed into different Qdrant collections:
- **PDF and DOCX → `document_rag` collection**
  Chunked by semantic meaning using the advanced chunker — separate handling for text, tables, code blocks, headings. Each chunk carries authority metadata — RERA circular gets level 1, court order level 2, lease agreement level 4, general report level 7.
- **Excel and CSV → `table_rag` collection**
  Table structure preserved. Each row becomes a searchable chunk. Column headers attached to every chunk as context. Numeric fields stored as payload for range filtering.

Both collections live in Qdrant. Both use Gemini dense vectors (768-dim) plus BM25 sparse vectors. This is the hybrid search setup.

## AI SEARCH — HOW THE RAG WORKS
User types a question at `/app/search`. Frontend sends the query to an n8n webhook. n8n does this:

**Step 1 — Classify the query**
Gemini reads the query and returns: structured, semantic, or hybrid.
- "Which leases expire in June?" → structured → SQL query on Supabase leases table. Fast. Exact.
- "What does the pet clause say in Unit 14B lease?" → semantic → vector search on document_rag.
- "Which properties had plumbing issues last year and what did they cost?" → hybrid → SQL on maintenance_tickets + vector search on documents.

**Step 2 — For semantic queries: per-category search**
Instead of one big search, n8n runs a separate Qdrant search per authority level. RERA circulars searched separately from court orders separately from lease agreements. This guarantees that an authoritative RERA document is not buried by 20 well-written blog posts that happen to score higher on similarity.

**Step 3 — Authority-weighted RRF fusion**
Results from all category searches are merged. RERA gets 2x weight. General literature gets 0.8x weight. Results sorted — highest authority first, then by score within each authority tier.

**Step 4 — Context formatted top-down**
The LLM receives context in order — RERA sources first, court orders second, lease agreements third. Each source tagged with its authority label, binding status, jurisdiction, document date.

**Step 5 — LLM generates answer**
Gemini reads the context and generates an answer with source citations. Hard rules enforced — never invent information, never flatten conflicting positions from different authority levels, always cite which source supports which claim.

**Step 6 — Response returned**
n8n sends answer back to frontend. Frontend displays the answer plus the source list — each source showing document name, authority level badge, page number, relevance score. Query and answer logged to query_log table.

## INVOICES MODULE
Invoices arrive via email or WhatsApp photo. n8n intercepts them. Sends to LlamaParse for data extraction — pulls out vendor name, invoice number, date, line items, GST, total amount.
n8n checks `maintenance_tickets` table for a matching open ticket for that vendor and property. If found, compares invoice amount to `estimated_cost`. If within 10% — auto-matched. If more than 10% deviation — flagged as anomaly. Sets `is_anomaly = true`, writes `anomaly_reason`.
n8n checks `invoices` table for duplicate invoice number from same vendor. If found — sets `is_duplicate = true`.
Clean invoices → n8n sends WhatsApp to property manager with invoice summary and Approve button. Manager taps Approve → n8n updates `status = approved` in `invoices` table.
Flagged invoices → held for manual review. Manager sees them in `/app/invoices` with red flag and explanation of the anomaly.

## ALERTS MODULE
n8n runs multiple scheduled checks daily at 8am:
- **Check 1 → `leases` table** — any lease expiring in exactly 30, 60, or 90 days? → Check `alerts` table to confirm this alert was not already sent → Send WhatsApp + email → Insert row into `alerts` table.
- **Check 2 → `units` table** — occupancy rate per property dropped below configured threshold? → Alert property manager.
- **Check 3 → `rent_payments` table** — any payment overdue by more than 3 days? → Alert assigned team member.
- **Check 4 → `maintenance_tickets` table** — any ticket open more than 48 hours with no vendor assigned? → Escalation alert.

All sent alerts stored in `alerts` table. Frontend at `/app/alerts` shows all alerts, read/unread status. Supabase Realtime pushes new alerts to the frontend instantly — no page refresh needed.

## ANALYTICS MODULE
`/app/analytics` reads directly from Supabase — no n8n involved. All queries run in parallel:
- Occupancy rate → count occupied units / total units per property
- Revenue vs target → sum `rent_payments.amount_paid` vs sum `leases.rent_amount` per month
- Maintenance cost → sum `maintenance_tickets.actual_cost` per property
- Lead conversion funnel → count leads by stage
- Collection efficiency → sum paid / sum due for current month
- Lease expiry timeline → count leases expiring per month for next 12 months

Charts rendered in the browser using the data returned. Supabase Realtime subscriptions on key tables mean numbers update live without refreshing.
Scheduled reports — n8n sends a PDF summary every Monday morning to management email. Generated by querying Supabase, formatting into a report, sending via email SMTP.

## HOW ALL TABLES CONNECT — SUMMARY
```
organizations
    ↓
    team_members (who is in the org)
    properties (what they manage)
        ↓
        units (individual rentable spaces)
            ↓
            leases (who rents which unit)
                ↓
                tenants (who the lease belongs to)
                rent_payments (monthly payment records)
                lease_amendments (version history)
            maintenance_tickets (issues in the unit)
                ↓
                vendors (who fixes issues)
                invoices (cost of fixing)
        documents (files attached to property/unit/lease)
            ↓
            Qdrant document_rag (PDF chunks + vectors)
            Qdrant table_rag (Excel chunks + vectors)
    leads (prospective tenants/buyers)
    alerts (all system notifications)
    query_log (all AI search history)
    audit_log (everything that changes)
    subscriptions (Stripe billing mirror)
```

## WHAT GOES WHERE — FRONTEND VS n8n
- **Frontend → Supabase directly:**
  Reading any data, adding properties, adding tenants, updating lead stage, marking alerts read, viewing documents, all dashboard metrics, all analytics.
- **Frontend → n8n webhook → Supabase:**
  Uploading documents (needs LlamaParse + embedding), AI search queries (needs RAG pipeline), sending WhatsApp messages, processing invoices, anything that requires heavy computation.
- **n8n → Supabase (scheduled, no frontend involved):**
  Lease expiry alerts, rent reminders, follow-up sequences, maintenance follow-ups, occupancy monitoring, weekly reports.
