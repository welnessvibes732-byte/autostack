# All Pages — Complete Sitemap

## PUBLIC PAGES (unauthenticated)

### 1. Landing Page — /
Hero, problem statement, features overview, social proof, pricing, CTA

### 2. Features Page — /features
Detailed breakdown of every module with visuals

### 3. Pricing Page — /pricing
3 tiers clearly explained, feature comparison table, FAQ

### 4. Use Cases Page — /use-cases
  - /use-cases/property-managers
  - /use-cases/real-estate-agencies
  - /use-cases/landlords
  - /use-cases/investment-companies

### 5. Blog — /blog
Content marketing, SEO, real estate + AI content

### 6. About — /about
Nithesh Devarla, Aethera story, mission

### 7. Contact — /contact
Simple form + booking link

### 8. Legal
  - /privacy-policy
  - /terms-of-service
  - /data-processing-agreement

---

## AUTH PAGES

### 9. Sign Up — /signup
Email + password OR Google OAuth
Plan selection before signup
Card capture via Stripe (free trial — no card OR card required, decide)

### 10. Login — /login

### 11. Forgot Password — /forgot-password

### 12. Onboarding Flow — /onboarding
Step 1: Business type (agency / landlord / investor)
Step 2: Portfolio size (number of units)
Step 3: Connect first data source (upload a lease, connect Gmail, upload Excel)
Step 4: Set notification preferences (WhatsApp number, email)
Step 5: Dashboard ready

---

## AUTHENTICATED APP PAGES

### 13. Main Dashboard — /app/dashboard
Real-time metrics overview:
- Total units, occupied, vacant
- Leases expiring in 30/60/90 days (count + list)
- Open maintenance tickets
- Leads pipeline status
- Collections this month vs target
- Recent activity feed
- Quick action buttons (Add property, Upload lease, Ask AI)

### 14. Properties Module — /app/properties
  /app/properties — Master list of all properties
  /app/properties/[id] — Single property view
    - Property details (address, type, owner)
    - Current tenant info
    - Lease status + expiry
    - Maintenance history
    - Financial summary (rent, deposits, outstanding)
    - Documents tab (leases, inspection reports)
    - Activity timeline

  /app/properties/add — Add new property form

### 15. Leases Module — /app/leases
  /app/leases — All active, expiring, expired leases
    - Filter by status, expiry date, property, tenant
    - Bulk actions (send renewal reminder)
    - Color-coded expiry urgency (red < 30d, amber 30–60d)

  /app/leases/[id] — Single lease view
    - Full lease metadata
    - Document viewer (PDF)
    - RAG query panel ("Ask this lease anything")
    - Renewal timeline
    - Amendment history
    - Alert log (which alerts sent, when)

  /app/leases/upload — Upload lease document
    - Drag and drop PDF
    - Auto-extraction preview (tenant name, dates, rent)
    - Confirm + index

### 16. Tenants Module — /app/tenants
  /app/tenants — All tenants, searchable
  /app/tenants/[id] — Single tenant view
    - Personal details
    - Current and past leases
    - Payment history
    - Maintenance requests submitted
    - Communication log
    - Documents (ID, bank statements)

### 17. Leads Module — /app/leads
  /app/leads — Lead pipeline view
    - Kanban: New → Qualified → Viewing Scheduled → Negotiating → Closed
    - List view toggle
    - Filter by source (WhatsApp, website, portal)
    - Lead score badge

  /app/leads/[id] — Single lead view
    - Full conversation history (WhatsApp thread)
    - Qualification answers
    - Auto-generated property matches
    - Agent assigned
    - Follow-up sequence status
    - Timeline of interactions

  /app/leads/settings — Lead automation settings
    - Qualification questions (editable)
    - Scoring rules
    - Follow-up sequence editor (Day 1, Day 3, Day 7 messages)
    - Routing rules (which agent gets which leads)

### 18. Maintenance Module — /app/maintenance
  /app/maintenance — All tickets
    - Filter by status (open, in-progress, closed)
    - Filter by property, issue type, vendor
    - Urgency flags

  /app/maintenance/[id] — Single ticket
    - Issue description + photos
    - Property + unit
    - Assigned vendor
    - Status timeline
    - Cost tracking
    - Communication thread with vendor
    - Resolution notes

  /app/maintenance/new — Submit new request
  /app/maintenance/vendors — Vendor directory
    - Vendor profiles (type, contact, rating, history)
    - Performance metrics (avg response time, avg cost, jobs completed)

### 19. Documents Module — /app/documents
  /app/documents — All uploaded documents
    - Filter by type (lease, inspection, compliance, invoice, report)
    - Filter by property, date, authority level
    - Search bar (triggers RAG search)
    - Upload button

  /app/documents/[id] — Single document view
    - PDF viewer
    - Metadata panel (type, date, property, authority level)
    - RAG Query panel (ask questions about this document)
    - Related documents

  /app/documents/upload — Upload flow
    - Drag and drop (PDF, DOCX, XLSX, CSV)
    - Document type selector (Lease / Compliance / Inspection / Invoice / Report / Other)
    - Authority level selector (for compliance docs)
    - Auto-processing status (LlamaParse → Gemini → Qdrant)

### 20. AI Search Module — /app/search
  PRIMARY FEATURE — The AI brain of the platform

  /app/search — Main RAG query interface
    - Large search bar ("Ask anything about your portfolio...")
    - Query type auto-detected (structured / semantic / hybrid)
    - Results panel showing:
      - Answer with source citations
      - Source documents listed with authority level badges
      - Confidence indicator
      - Related questions suggested

    Examples shown to new users:
    - "Which leases expire in the next 30 days?"
    - "What does Unit 14B's lease say about pets?"
    - "Which vendor did we use for plumbing last year?"
    - "What is our policy on late payment fees?"
    - "Show me all properties with maintenance cost above ₹50,000 this year"

  /app/search/history — Past query log with answers

### 21. Analytics & Reports — /app/analytics
  /app/analytics — Live dashboard
    - Portfolio occupancy rate (gauge chart)
    - Revenue vs target (bar chart, monthly)
    - Maintenance cost per property (sorted table)
    - Lead conversion funnel
    - Collection efficiency rate
    - Lease expiry timeline (next 12 months)
    - Agent performance table

  /app/analytics/reports — Scheduled reports
    - Configure daily/weekly/monthly reports
    - Choose metrics
    - Choose delivery (email / WhatsApp)
    - Report history + download

### 22. Invoices Module — /app/invoices
  /app/invoices — All vendor invoices
    - Status: Received, Matched, Approved, Paid, Flagged
    - Filter by vendor, property, date range

  /app/invoices/[id] — Single invoice
    - Extracted data (vendor, amount, date, line items, GST)
    - Matched work order
    - Anomaly flags (if amount deviates from historical)
    - Approve / Query / Reject actions
    - Duplicate detection warning if applicable

  /app/invoices/upload — Manual invoice upload

### 23. Alerts & Notifications — /app/alerts
  /app/alerts — All active alerts
    - Lease expiry alerts
    - Occupancy drop alerts
    - Maintenance overdue alerts
    - Collection overdue alerts
    - System alerts (ingestion failures, etc.)

  /app/alerts/settings — Alert configuration
    - Per alert type: on/off toggle
    - Threshold settings (e.g. alert when occupancy < 80%)
    - Delivery method (WhatsApp / email / in-app)
    - Recipient assignment

### 24. Integrations — /app/integrations
  Available connectors:
  - Gmail (for email-based document ingestion)
  - Google Drive (document backup)
  - WhatsApp Business API
  - Stripe (billing)
  - Zapier / Make (coming soon)
  - Direct API access

  Each shows: connected / not connected status + setup guide

### 25. Settings — /app/settings
  /app/settings/profile — User profile
  /app/settings/organization — Agency/company details
  /app/settings/team — Team members, roles, permissions
  /app/settings/subscription — Current plan, usage, upgrade/downgrade, invoices
  /app/settings/notifications — Global notification preferences
  /app/settings/api — API keys for developer access
  /app/settings/data — Data export, delete account, GDPR controls

### 26. Admin Panel (Nithesh only) — /admin
  /admin/users — All users, plans, activity
  /admin/subscriptions — Revenue, churn, MRR
  /admin/usage — Per-user storage, query count, document count
  /admin/system — n8n workflow status, Qdrant health, Supabase health