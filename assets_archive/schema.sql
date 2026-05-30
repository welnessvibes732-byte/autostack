-- Supabase Database Schema for PropIQ

-- Enable UUID extension if not already enabled (Supabase usually has it)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-------------------------------------------------------------------------------
-- 1. ORGANIZATIONS (Multi-tenancy root)
-------------------------------------------------------------------------------
CREATE TABLE organizations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  business_type     TEXT,        -- agency | landlord | investor | manager
  country           TEXT DEFAULT 'IN',
  currency          TEXT DEFAULT 'INR',
  subscription_plan TEXT DEFAULT 'starter',  -- starter | growth | agency | enterprise
  subscription_status TEXT DEFAULT 'trialing', -- trialing | active | past_due | canceled
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  unit_count        INT DEFAULT 0,
  lead_settings     JSONB,
  owner_id          UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------------------------------
-- 2. TEAM MEMBERS
-------------------------------------------------------------------------------
CREATE TABLE team_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id),
  role            TEXT DEFAULT 'agent',  -- owner | admin | manager | agent | viewer
  full_name       TEXT,
  email           TEXT,
  phone           TEXT,
  whatsapp_number TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------------------------------
-- 3. PROPERTIES
-------------------------------------------------------------------------------
CREATE TABLE properties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT,
  address_line1   TEXT NOT NULL,
  address_line2   TEXT,
  city            TEXT NOT NULL,
  state           TEXT,
  country         TEXT DEFAULT 'IN',
  pincode         TEXT,
  property_type   TEXT,  -- residential | commercial | industrial | mixed
  total_units     INT DEFAULT 1,
  year_built      INT,
  owner_name      TEXT,
  owner_phone     TEXT,
  owner_email     TEXT,
  status          TEXT DEFAULT 'active',  -- active | inactive | sold
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_properties_org ON properties(organization_id);

-------------------------------------------------------------------------------
-- 4. UNITS
-------------------------------------------------------------------------------
CREATE TABLE units (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID REFERENCES properties(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  unit_number     TEXT NOT NULL,
  unit_type       TEXT,
  area_sqft       NUMERIC,
  floor_number    INT,
  status          TEXT DEFAULT 'vacant',  -- occupied | vacant | under_maintenance
  rent_amount     NUMERIC(12,2),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_status   ON units(status);

-------------------------------------------------------------------------------
-- 5. TENANTS
-------------------------------------------------------------------------------
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT NOT NULL,
  whatsapp_number TEXT,
  id_type         TEXT,
  id_number       TEXT,
  date_of_birth   DATE,
  employer_name   TEXT,
  monthly_income  NUMERIC(12,2),
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------------------------------
-- 6. LEASES
-------------------------------------------------------------------------------
CREATE TABLE leases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id         UUID REFERENCES units(id),
  tenant_id       UUID REFERENCES tenants(id),
  assigned_pm     UUID REFERENCES team_members(id),
  start_date      DATE NOT NULL,
  expiry_date     DATE NOT NULL,
  rent_amount     NUMERIC(12,2) NOT NULL,
  deposit_amount  NUMERIC(12,2),
  payment_due_day INT DEFAULT 1,
  lease_type      TEXT DEFAULT 'residential',
  notice_period_days INT DEFAULT 30,
  has_pet_clause          BOOLEAN,
  has_subletting_clause   BOOLEAN,
  has_escalation_clause   BOOLEAN,
  escalation_percent      NUMERIC(5,2),
  maintenance_by          TEXT,
  late_fee_amount         NUMERIC(12,2),
  lease_status    TEXT DEFAULT 'active',
  renewal_status  TEXT,
  file_path       TEXT,
  stored_hash     TEXT,
  index_status    TEXT DEFAULT 'pending',
  version         INT DEFAULT 1,
  needs_manual_review BOOLEAN DEFAULT false,
  missing_fields  TEXT[],
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leases_expiry    ON leases(expiry_date);
CREATE INDEX idx_leases_status    ON leases(lease_status);
CREATE INDEX idx_leases_unit      ON leases(unit_id);
CREATE INDEX idx_leases_tenant    ON leases(tenant_id);
CREATE INDEX idx_leases_org       ON leases(organization_id);

-------------------------------------------------------------------------------
-- 7. LEASE AMENDMENTS
-------------------------------------------------------------------------------
CREATE TABLE lease_amendments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id    UUID REFERENCES leases(id) ON DELETE CASCADE,
  version     INT NOT NULL,
  file_path   TEXT,
  new_hash    TEXT,
  changed_by  UUID REFERENCES team_members(id),
  change_notes TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------------------------------
-- 8. DOCUMENTS
-------------------------------------------------------------------------------
CREATE TABLE documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  property_id      UUID REFERENCES properties(id),
  unit_id          UUID REFERENCES units(id),
  lease_id         UUID REFERENCES leases(id),
  tenant_id        UUID REFERENCES tenants(id),
  uploaded_by      UUID REFERENCES team_members(id),
  file_name        TEXT NOT NULL,
  file_path        TEXT NOT NULL,
  file_type        TEXT,
  file_size_bytes  BIGINT,
  stored_hash      TEXT,
  doc_type         TEXT,
  authority_category TEXT,
  authority_level  INT,
  is_binding       BOOLEAN DEFAULT false,
  jurisdiction     TEXT,
  doc_date         DATE,
  index_status     TEXT DEFAULT 'pending',
  indexed_at       TIMESTAMPTZ,
  chunk_count      INT DEFAULT 0,
  extraction_model TEXT DEFAULT 'llamaparse',
  notes            TEXT,
  tags             TEXT[],
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_docs_org      ON documents(organization_id);
CREATE INDEX idx_docs_type     ON documents(doc_type);
CREATE INDEX idx_docs_status   ON documents(index_status);

-------------------------------------------------------------------------------
-- 9. LEADS
-------------------------------------------------------------------------------
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_to     UUID REFERENCES team_members(id),
  full_name       TEXT,
  phone           TEXT,
  email           TEXT,
  whatsapp_number TEXT,
  source          TEXT,
  inquiry_type    TEXT,
  budget_min      NUMERIC(15,2),
  budget_max      NUMERIC(15,2),
  preferred_area  TEXT,
  property_type   TEXT,
  bedrooms        INT,
  move_in_timeline TEXT,
  stage           TEXT DEFAULT 'new',
  lead_score      INT DEFAULT 0,
  is_hot          BOOLEAN DEFAULT false,
  auto_responded     BOOLEAN DEFAULT false,
  auto_responded_at  TIMESTAMPTZ,
  follow_up_sequence TEXT DEFAULT 'standard',
  follow_up_day      INT DEFAULT 0,
  last_contact_at    TIMESTAMPTZ,
  next_follow_up_at  TIMESTAMPTZ,
  whatsapp_thread JSONB,
  qualification_answers JSONB,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_org    ON leads(organization_id);
CREATE INDEX idx_leads_stage  ON leads(stage);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_score  ON leads(lead_score DESC);

-------------------------------------------------------------------------------
-- 10. VENDORS
-------------------------------------------------------------------------------
CREATE TABLE vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        TEXT[],
  phone           TEXT,
  email           TEXT,
  whatsapp_number TEXT,
  address         TEXT,
  service_pincodes TEXT[],
  gstin           TEXT,
  bank_account    TEXT,
  bank_ifsc       TEXT,
  rating          NUMERIC(3,2) DEFAULT 0,
  jobs_completed  INT DEFAULT 0,
  avg_response_hours NUMERIC(6,2),
  avg_cost_per_job   NUMERIC(12,2),
  is_preferred    BOOLEAN DEFAULT false,
  is_blacklisted  BOOLEAN DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------------------------------
-- 11. MAINTENANCE TICKETS
-------------------------------------------------------------------------------
CREATE TABLE maintenance_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  property_id     UUID REFERENCES properties(id),
  unit_id         UUID REFERENCES units(id),
  tenant_id       UUID REFERENCES tenants(id),
  assigned_to     UUID REFERENCES team_members(id),
  vendor_id       UUID REFERENCES vendors(id),
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  priority        TEXT DEFAULT 'medium',
  photos          TEXT[],
  status          TEXT DEFAULT 'open',
  reported_at     TIMESTAMPTZ DEFAULT now(),
  assigned_at     TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  estimated_cost  NUMERIC(12,2),
  actual_cost     NUMERIC(12,2),
  invoice_id      UUID,
  resolution_notes TEXT,
  tenant_rating    INT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_maint_org      ON maintenance_tickets(organization_id);
CREATE INDEX idx_maint_status   ON maintenance_tickets(status);
CREATE INDEX idx_maint_property ON maintenance_tickets(property_id);
CREATE INDEX idx_maint_vendor   ON maintenance_tickets(vendor_id);

-------------------------------------------------------------------------------
-- 12. INVOICES
-------------------------------------------------------------------------------
CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id         UUID REFERENCES vendors(id),
  maintenance_id    UUID REFERENCES maintenance_tickets(id),
  property_id       UUID REFERENCES properties(id),
  invoice_number    TEXT,
  invoice_date      DATE,
  due_date          DATE,
  vendor_name       TEXT,
  line_items        JSONB,
  subtotal          NUMERIC(12,2),
  gst_amount        NUMERIC(12,2),
  total_amount      NUMERIC(12,2) NOT NULL,
  work_order_amount  NUMERIC(12,2),
  amount_deviation   NUMERIC(8,2),
  is_anomaly         BOOLEAN DEFAULT false,
  anomaly_reason     TEXT,
  is_duplicate       BOOLEAN DEFAULT false,
  status            TEXT DEFAULT 'received',
  approved_by       UUID REFERENCES team_members(id),
  approved_at       TIMESTAMPTZ,
  payment_date      DATE,
  payment_ref       TEXT,
  file_path         TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------------------------------
-- 13. RENT PAYMENTS
-------------------------------------------------------------------------------
CREATE TABLE rent_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  lease_id        UUID REFERENCES leases(id),
  tenant_id       UUID REFERENCES tenants(id),
  unit_id         UUID REFERENCES units(id),
  amount_due      NUMERIC(12,2) NOT NULL,
  amount_paid     NUMERIC(12,2) DEFAULT 0,
  due_date        DATE NOT NULL,
  paid_date       DATE,
  payment_method  TEXT,
  payment_ref     TEXT,
  late_fee        NUMERIC(12,2) DEFAULT 0,
  status          TEXT DEFAULT 'pending',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_org    ON rent_payments(organization_id);
CREATE INDEX idx_payments_status ON rent_payments(status);
CREATE INDEX idx_payments_due    ON rent_payments(due_date);

-------------------------------------------------------------------------------
-- 14. ALERTS
-------------------------------------------------------------------------------
CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type      TEXT NOT NULL,
  entity_type     TEXT,
  entity_id       UUID,
  message         TEXT NOT NULL,
  severity        TEXT DEFAULT 'info',
  sent_via        TEXT[],
  sent_to         UUID REFERENCES team_members(id),
  is_read         BOOLEAN DEFAULT false,
  sent_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alerts_org  ON alerts(organization_id);
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_read ON alerts(is_read);

-------------------------------------------------------------------------------
-- 15. QUERY LOG
-------------------------------------------------------------------------------
CREATE TABLE query_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id),
  query           TEXT NOT NULL,
  query_type      TEXT,
  answer          TEXT,
  sources         JSONB,
  has_binding_sources BOOLEAN,
  response_ms     INT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------------------------------
-- 16. AUDIT LOG
-------------------------------------------------------------------------------
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id         UUID REFERENCES auth.users(id),
  action          TEXT NOT NULL,
  entity_type     TEXT,
  entity_id       UUID,
  old_values      JSONB,
  new_values      JSONB,
  ip_address      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------------------------------
-- 17. SUBSCRIPTIONS
-------------------------------------------------------------------------------
CREATE TABLE subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID REFERENCES organizations(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id     TEXT,
  plan                   TEXT,
  status                 TEXT,
  unit_limit             INT,
  current_unit_count     INT DEFAULT 0,
  billing_cycle_start    DATE,
  billing_cycle_end      DATE,
  amount_per_month       NUMERIC(10,2),
  currency               TEXT DEFAULT 'USD',
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

-------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-------------------------------------------------------------------------------

-- 1. Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Organizations Isolation
-- Users can only read their own org (team_members logic requires care, simplified for setup)
CREATE POLICY "org_isolation" ON organizations
  FOR ALL
  USING (
    id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()) OR owner_id = auth.uid()
  );

-- Helper policy for team members to see themselves/their team
CREATE POLICY "team_members_isolation" ON team_members
  FOR ALL
  USING (
    user_id = auth.uid() OR organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid())
  );

-- Macro policy for all other tables referencing organization_id
CREATE POLICY "org_isolation" ON properties FOR ALL USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "org_isolation" ON units FOR ALL USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "org_isolation" ON tenants FOR ALL USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "org_isolation" ON leases FOR ALL USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "org_isolation" ON documents FOR ALL USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "org_isolation" ON leads FOR ALL USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "org_isolation" ON vendors FOR ALL USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "org_isolation" ON maintenance_tickets FOR ALL USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "org_isolation" ON invoices FOR ALL USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "org_isolation" ON rent_payments FOR ALL USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "org_isolation" ON alerts FOR ALL USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "org_isolation" ON query_log FOR ALL USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "org_isolation" ON audit_log FOR ALL USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));
CREATE POLICY "org_isolation" ON subscriptions FOR ALL USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));
