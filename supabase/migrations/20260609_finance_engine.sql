-- ============================================================================
-- AETHERA FINANCE ENGINE — Phase 1: Fix All Financial Flaws
-- ============================================================================
-- This migration:
-- 1. Creates security_deposits table (track deposit lifecycle)
-- 2. Creates tenant_charges table (charge tenants for damages)
-- 3. Adds late fee tracking columns to rent_payments
-- 4. Adds payment tracking columns to invoices  
-- 5. Creates accounts table (Chart of Accounts / Money Categories)
-- 6. Creates journal_entries table (receipts for every money movement)
-- 7. Creates ledger_lines table (the actual debit/credit lines)
-- 8. Creates fiscal_periods table (month/year tracking)
-- 9. Seeds default Chart of Accounts
-- 10. Creates auto-triggers for all money events
-- 11. Creates report functions (Trial Balance, P&L, NOI)
-- 12. Adds immutability rules + RLS policies
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SECURITY DEPOSITS — Track the full lifecycle of every deposit
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_deposits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  lease_id          UUID REFERENCES leases(id),
  tenant_id         UUID REFERENCES tenants(id) NOT NULL,
  unit_id           UUID REFERENCES units(id),
  property_id       UUID REFERENCES properties(id),
  deposit_amount    NUMERIC(12,2) NOT NULL,
  received_date     DATE,
  received_method   TEXT,  -- upi | bank_transfer | cash | cheque
  received_ref      TEXT,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','received','partially_refunded','fully_refunded','forfeited')),
  deduction_amount  NUMERIC(12,2) DEFAULT 0,
  deduction_reason  TEXT,
  refund_amount     NUMERIC(12,2) DEFAULT 0,
  refund_date       DATE,
  refund_method     TEXT,
  refund_ref        TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_deposits_org ON security_deposits(organization_id);
CREATE INDEX idx_deposits_tenant ON security_deposits(tenant_id);
CREATE INDEX idx_deposits_status ON security_deposits(status);
CREATE INDEX idx_deposits_lease ON security_deposits(lease_id);

ALTER TABLE security_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON security_deposits FOR ALL 
  USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TENANT CHARGES — Bill tenants for damages, utilities, etc.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_charges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  tenant_id         UUID REFERENCES tenants(id) NOT NULL,
  unit_id           UUID REFERENCES units(id),
  property_id       UUID REFERENCES properties(id),
  charge_type       TEXT NOT NULL CHECK (charge_type IN ('maintenance','damage','utility','cam','penalty','other')),
  source_type       TEXT,  -- maintenance_ticket | manual
  source_id         UUID,  -- links to maintenance_tickets.id if applicable
  description       TEXT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','deducted_from_deposit','waived','disputed')),
  paid_date         DATE,
  paid_method       TEXT,
  paid_ref          TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tcharges_org ON tenant_charges(organization_id);
CREATE INDEX idx_tcharges_tenant ON tenant_charges(tenant_id);
CREATE INDEX idx_tcharges_status ON tenant_charges(status);

ALTER TABLE tenant_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON tenant_charges FOR ALL 
  USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FIX RENT PAYMENTS — Add proper late fee tracking
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS late_fee_days INT DEFAULT 0;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS late_fee_charged NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS late_fee_paid NUMERIC(12,2) DEFAULT 0;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS late_fee_waived BOOLEAN DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FIX INVOICES — Separate approval from payment
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' 
  CHECK (payment_status IN ('unpaid','partial','paid'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_input_credit BOOLEAN DEFAULT true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CHART OF ACCOUNTS — All the money categories
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  code              TEXT NOT NULL,
  name              TEXT NOT NULL,
  account_type      TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  parent_id         UUID REFERENCES accounts(id),
  is_system         BOOLEAN DEFAULT false,
  is_active         BOOLEAN DEFAULT true,
  description       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_accounts_org ON accounts(organization_id);
CREATE INDEX idx_accounts_type ON accounts(account_type);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON accounts FOR ALL 
  USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. JOURNAL ENTRIES — The receipt for every money movement
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  entry_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_number      TEXT NOT NULL,
  description       TEXT NOT NULL,
  source_type       TEXT,  -- rent_payment | invoice_approved | invoice_paid | deposit_received | deposit_returned | tenant_charge | manual
  source_id         UUID,
  property_id       UUID REFERENCES properties(id),
  unit_id           UUID REFERENCES units(id),
  is_auto           BOOLEAN DEFAULT false,
  is_reversed       BOOLEAN DEFAULT false,
  reversed_by       UUID REFERENCES journal_entries(id),
  posted_by         UUID,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, entry_number)
);

CREATE INDEX idx_je_org ON journal_entries(organization_id);
CREATE INDEX idx_je_date ON journal_entries(entry_date);
CREATE INDEX idx_je_source ON journal_entries(source_type, source_id);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON journal_entries FOR ALL 
  USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));

-- IMMUTABILITY: No updates or deletes on journal entries
CREATE OR REPLACE RULE "prevent_je_update" AS ON UPDATE TO journal_entries DO INSTEAD NOTHING;
CREATE OR REPLACE RULE "prevent_je_delete" AS ON DELETE TO journal_entries DO INSTEAD NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. LEDGER LINES — The actual debit/credit lines
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ledger_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id  UUID REFERENCES journal_entries(id) NOT NULL,
  account_id        UUID REFERENCES accounts(id) NOT NULL,
  debit             NUMERIC(14,2) DEFAULT 0 CHECK (debit >= 0),
  credit            NUMERIC(14,2) DEFAULT 0 CHECK (credit >= 0),
  description       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ll_je ON ledger_lines(journal_entry_id);
CREATE INDEX idx_ll_account ON ledger_lines(account_id);

ALTER TABLE ledger_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON ledger_lines FOR ALL 
  USING (journal_entry_id IN (SELECT id FROM journal_entries WHERE organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid())));

-- IMMUTABILITY: No updates or deletes on ledger lines
CREATE OR REPLACE RULE "prevent_ll_update" AS ON UPDATE TO ledger_lines DO INSTEAD NOTHING;
CREATE OR REPLACE RULE "prevent_ll_delete" AS ON DELETE TO ledger_lines DO INSTEAD NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. FISCAL PERIODS — Month/year tracking for closing books
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fiscal_periods (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  period_label      TEXT,  -- "June 2026", "Q1 2026", etc.
  status            TEXT DEFAULT 'open' CHECK (status IN ('open','closed','locked')),
  closed_by         UUID,
  closed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, period_start, period_end)
);

ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON fiscal_periods FOR ALL 
  USING (organization_id IN (SELECT organization_id FROM team_members WHERE user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. SEED DEFAULT CHART OF ACCOUNTS
-- This function creates the standard accounts for any organization.
-- Call it when a new org signs up, or run it for existing orgs.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION seed_chart_of_accounts(org_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Only seed if the org doesn't already have accounts
  IF EXISTS (SELECT 1 FROM accounts WHERE organization_id = org_id) THEN
    RETURN;
  END IF;

  INSERT INTO accounts (organization_id, code, name, account_type, is_system, description) VALUES
    -- ASSETS (what you own / money owed to you)
    (org_id, '1000', 'Cash in Bank',           'asset',     true, 'Money sitting in your bank account'),
    (org_id, '1100', 'Accounts Receivable',     'asset',     true, 'Rent or fees tenants owe you but have not paid yet'),
    (org_id, '1200', 'Security Deposits Held',  'asset',     true, 'Deposit money currently in your bank (you hold it for tenants)'),
    (org_id, '1300', 'GST Input Credit',        'asset',     true, 'GST you paid on vendor bills that the government owes you back'),
    -- LIABILITIES (what you owe others)
    (org_id, '2000', 'Accounts Payable',        'liability', true, 'Vendor bills you approved but have not paid yet'),
    (org_id, '2100', 'Security Deposits Owed',  'liability', true, 'Deposits you must return to tenants when they leave'),
    (org_id, '2200', 'GST Payable',             'liability', true, 'GST you collected that must go to the government'),
    -- EQUITY (owner stake)
    (org_id, '3000', 'Owner Equity',            'equity',    true, 'The owner''s stake in the business'),
    (org_id, '3100', 'Retained Earnings',       'equity',    true, 'Accumulated profits from previous periods'),
    -- REVENUE (money earned)
    (org_id, '4000', 'Rental Revenue',          'revenue',   true, 'Money earned from tenant rent payments'),
    (org_id, '4100', 'Late Fee Revenue',        'revenue',   true, 'Penalty income when tenants pay rent late'),
    (org_id, '4200', 'Maintenance Recovery',    'revenue',   true, 'Money charged back to tenants for damage they caused'),
    (org_id, '4300', 'CAM Revenue',             'revenue',   true, 'Common Area Maintenance charges collected from tenants'),
    (org_id, '4400', 'Other Revenue',           'revenue',   true, 'Parking fees, utility recharges, and other miscellaneous income'),
    -- EXPENSES (money spent)
    (org_id, '5000', 'Maintenance Expense',     'expense',   true, 'Money spent on property repairs and upkeep'),
    (org_id, '5100', 'Vendor Payments',         'expense',   true, 'Money paid to external vendors for services'),
    (org_id, '5200', 'Management Fees',         'expense',   true, 'Property management company fees'),
    (org_id, '5300', 'Insurance Expense',       'expense',   true, 'Building insurance premium payments'),
    (org_id, '5400', 'Property Tax',            'expense',   true, 'Municipal/government property taxes'),
    (org_id, '5500', 'Utilities Expense',       'expense',   true, 'Electricity, water, gas for common areas'),
    (org_id, '5600', 'Legal Fees',              'expense',   true, 'Lawyer costs for disputes, evictions, contracts');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. HELPER: Generate next journal entry number
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION next_je_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INT)), 0) + 1
  INTO next_num
  FROM journal_entries
  WHERE organization_id = org_id;
  
  RETURN 'JE-' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. HELPER: Create a balanced journal entry with lines
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_journal_entry(
  p_org_id UUID,
  p_description TEXT,
  p_source_type TEXT,
  p_source_id UUID,
  p_property_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL,
  p_lines JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID AS $$
DECLARE
  je_id UUID;
  je_num TEXT;
  total_debit NUMERIC := 0;
  total_credit NUMERIC := 0;
  line JSONB;
  acct_id UUID;
BEGIN
  -- Validate: lines must balance
  FOR line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    total_debit := total_debit + COALESCE((line->>'debit')::NUMERIC, 0);
    total_credit := total_credit + COALESCE((line->>'credit')::NUMERIC, 0);
  END LOOP;

  IF total_debit != total_credit THEN
    RAISE EXCEPTION 'Journal entry does not balance: debits (%) != credits (%)', total_debit, total_credit;
  END IF;

  IF total_debit = 0 THEN
    RAISE EXCEPTION 'Journal entry has zero amount';
  END IF;

  -- Create the journal entry
  je_num := next_je_number(p_org_id);
  INSERT INTO journal_entries (organization_id, entry_number, description, source_type, source_id, property_id, unit_id, is_auto)
  VALUES (p_org_id, je_num, p_description, p_source_type, p_source_id, p_property_id, p_unit_id, true)
  RETURNING id INTO je_id;

  -- Create the ledger lines
  FOR line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    -- Look up account by code
    SELECT id INTO acct_id FROM accounts 
    WHERE organization_id = p_org_id AND code = (line->>'account_code')
    LIMIT 1;

    IF acct_id IS NULL THEN
      RAISE EXCEPTION 'Account code % not found for org %', line->>'account_code', p_org_id;
    END IF;

    INSERT INTO ledger_lines (journal_entry_id, account_id, debit, credit, description)
    VALUES (
      je_id,
      acct_id,
      COALESCE((line->>'debit')::NUMERIC, 0),
      COALESCE((line->>'credit')::NUMERIC, 0),
      COALESCE(line->>'description', '')
    );
  END LOOP;

  RETURN je_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. TRIGGER: Rent Payment → Journal Entry
-- When rent_payments.status changes to 'paid', auto-create journal entry
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_rent_payment_journal()
RETURNS TRIGGER AS $$
DECLARE
  je_id UUID;
  v_lines JSONB := '[]'::JSONB;
  v_tenant_name TEXT;
  v_unit_number TEXT;
  v_property_id UUID;
  v_late_amount NUMERIC;
BEGIN
  -- Only fire when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    
    -- Ensure chart of accounts exists
    PERFORM seed_chart_of_accounts(NEW.organization_id);

    -- Get context info for description
    SELECT t.full_name INTO v_tenant_name FROM tenants t WHERE t.id = NEW.tenant_id;
    SELECT u.unit_number, u.property_id INTO v_unit_number, v_property_id FROM units u WHERE u.id = NEW.unit_id;

    -- Auto-calculate late fee if applicable
    IF NEW.paid_date IS NOT NULL AND NEW.due_date IS NOT NULL AND NEW.paid_date > NEW.due_date THEN
      NEW.late_fee_days := NEW.paid_date - NEW.due_date;
      -- Get late fee rate from lease
      SELECT COALESCE(l.late_fee_amount, 0) * NEW.late_fee_days INTO v_late_amount
      FROM leases l WHERE l.id = NEW.lease_id;
      NEW.late_fee_charged := COALESCE(v_late_amount, 0);
    END IF;

    -- Build journal entry lines
    -- Line 1: Debit Cash (money came into bank)
    v_lines := v_lines || jsonb_build_object(
      'account_code', '1000',
      'debit', NEW.amount_paid,
      'credit', 0,
      'description', 'Rent received from ' || COALESCE(v_tenant_name, 'tenant')
    );
    -- Line 2: Credit Rental Revenue (property earned money)
    v_lines := v_lines || jsonb_build_object(
      'account_code', '4000',
      'debit', 0,
      'credit', NEW.amount_paid,
      'description', 'Rent revenue for unit ' || COALESCE(v_unit_number, 'N/A')
    );

    -- If late fee exists, add those lines too
    IF COALESCE(NEW.late_fee_charged, 0) > 0 THEN
      v_lines := v_lines || jsonb_build_object(
        'account_code', '1000',
        'debit', NEW.late_fee_charged,
        'credit', 0,
        'description', 'Late fee received'
      );
      v_lines := v_lines || jsonb_build_object(
        'account_code', '4100',
        'debit', 0,
        'credit', NEW.late_fee_charged,
        'description', 'Late fee penalty income'
      );
    END IF;

    -- Create the journal entry
    je_id := create_journal_entry(
      NEW.organization_id,
      'Rent payment received — ' || COALESCE(v_tenant_name, 'tenant') || ', ' || COALESCE(v_unit_number, 'unit'),
      'rent_payment',
      NEW.id,
      v_property_id,
      NEW.unit_id,
      v_lines
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_rent_paid ON rent_payments;
CREATE TRIGGER trg_rent_paid
  BEFORE UPDATE ON rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION trg_rent_payment_journal();

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. TRIGGER: Invoice Approved → Journal Entry
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_invoice_approved_journal()
RETURNS TRIGGER AS $$
DECLARE
  je_id UUID;
  v_lines JSONB := '[]'::JSONB;
  v_vendor TEXT;
  v_net NUMERIC;
  v_gst NUMERIC;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    
    PERFORM seed_chart_of_accounts(NEW.organization_id);

    v_vendor := COALESCE(NEW.vendor_name, 'vendor');
    v_gst := COALESCE(NEW.gst_amount, 0);
    v_net := NEW.total_amount - v_gst;

    -- Line 1: Debit Maintenance Expense (expense recognized)
    v_lines := v_lines || jsonb_build_object(
      'account_code', '5000', 'debit', v_net, 'credit', 0,
      'description', 'Expense for ' || v_vendor
    );

    -- Line 2: Debit GST Input Credit (if GST exists)
    IF v_gst > 0 THEN
      v_lines := v_lines || jsonb_build_object(
        'account_code', '1300', 'debit', v_gst, 'credit', 0,
        'description', 'GST input credit on invoice'
      );
    END IF;

    -- Line 3: Credit Accounts Payable (we owe this money now)
    v_lines := v_lines || jsonb_build_object(
      'account_code', '2000', 'debit', 0, 'credit', NEW.total_amount,
      'description', 'Amount payable to ' || v_vendor
    );

    je_id := create_journal_entry(
      NEW.organization_id,
      'Invoice approved — ' || v_vendor || ' (₹' || NEW.total_amount || ')',
      'invoice_approved',
      NEW.id,
      NEW.property_id,
      NULL,
      v_lines
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_invoice_approved ON invoices;
CREATE TRIGGER trg_invoice_approved
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION trg_invoice_approved_journal();

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. TRIGGER: Invoice Paid → Journal Entry
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_invoice_paid_journal()
RETURNS TRIGGER AS $$
DECLARE
  je_id UUID;
  v_lines JSONB := '[]'::JSONB;
  v_vendor TEXT;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    
    PERFORM seed_chart_of_accounts(NEW.organization_id);
    v_vendor := COALESCE(NEW.vendor_name, 'vendor');

    -- Line 1: Debit Accounts Payable (we don't owe anymore)
    v_lines := v_lines || jsonb_build_object(
      'account_code', '2000', 'debit', NEW.total_amount, 'credit', 0,
      'description', 'Payment cleared for ' || v_vendor
    );
    -- Line 2: Credit Cash (money left the bank)
    v_lines := v_lines || jsonb_build_object(
      'account_code', '1000', 'debit', 0, 'credit', NEW.total_amount,
      'description', 'Bank payment to ' || v_vendor
    );

    je_id := create_journal_entry(
      NEW.organization_id,
      'Invoice paid — ' || v_vendor || ' (₹' || NEW.total_amount || ')',
      'invoice_paid',
      NEW.id,
      NEW.property_id,
      NULL,
      v_lines
    );

    -- Also update payment tracking
    NEW.paid_amount := NEW.total_amount;
    NEW.payment_status := 'paid';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_invoice_paid ON invoices;
CREATE TRIGGER trg_invoice_paid
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION trg_invoice_paid_journal();

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. TRIGGER: Security Deposit Received → Journal Entry
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_deposit_received_journal()
RETURNS TRIGGER AS $$
DECLARE
  je_id UUID;
  v_lines JSONB := '[]'::JSONB;
  v_tenant TEXT;
BEGIN
  IF NEW.status = 'received' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'received') THEN
    
    PERFORM seed_chart_of_accounts(NEW.organization_id);
    SELECT full_name INTO v_tenant FROM tenants WHERE id = NEW.tenant_id;

    -- Debit Cash (money came in)
    v_lines := v_lines || jsonb_build_object(
      'account_code', '1000', 'debit', NEW.deposit_amount, 'credit', 0,
      'description', 'Deposit received from ' || COALESCE(v_tenant, 'tenant')
    );
    -- Credit Deposits Owed (we owe this back)
    v_lines := v_lines || jsonb_build_object(
      'account_code', '2100', 'debit', 0, 'credit', NEW.deposit_amount,
      'description', 'Deposit liability for ' || COALESCE(v_tenant, 'tenant')
    );

    je_id := create_journal_entry(
      NEW.organization_id,
      'Security deposit received — ' || COALESCE(v_tenant, 'tenant'),
      'deposit_received',
      NEW.id,
      NEW.property_id,
      NEW.unit_id,
      v_lines
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_deposit_received ON security_deposits;
CREATE TRIGGER trg_deposit_received
  AFTER INSERT OR UPDATE ON security_deposits
  FOR EACH ROW
  EXECUTE FUNCTION trg_deposit_received_journal();

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. TRIGGER: Security Deposit Returned → Journal Entry
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_deposit_returned_journal()
RETURNS TRIGGER AS $$
DECLARE
  je_id UUID;
  v_lines JSONB := '[]'::JSONB;
  v_tenant TEXT;
BEGIN
  IF NEW.status IN ('fully_refunded','partially_refunded') AND OLD.status NOT IN ('fully_refunded','partially_refunded') THEN
    
    PERFORM seed_chart_of_accounts(NEW.organization_id);
    SELECT full_name INTO v_tenant FROM tenants WHERE id = NEW.tenant_id;

    -- Debit Deposits Owed (we don't owe anymore)
    v_lines := v_lines || jsonb_build_object(
      'account_code', '2100', 'debit', NEW.deposit_amount, 'credit', 0,
      'description', 'Deposit liability cleared for ' || COALESCE(v_tenant, 'tenant')
    );
    -- Credit Cash (refund amount left the bank)
    IF COALESCE(NEW.refund_amount, 0) > 0 THEN
      v_lines := v_lines || jsonb_build_object(
        'account_code', '1000', 'debit', 0, 'credit', NEW.refund_amount,
        'description', 'Deposit refunded to ' || COALESCE(v_tenant, 'tenant')
      );
    END IF;
    -- Credit Maintenance Recovery (deductions = income for you)
    IF COALESCE(NEW.deduction_amount, 0) > 0 THEN
      v_lines := v_lines || jsonb_build_object(
        'account_code', '4200', 'debit', 0, 'credit', NEW.deduction_amount,
        'description', 'Damage deduction from deposit: ' || COALESCE(NEW.deduction_reason, 'damages')
      );
    END IF;

    je_id := create_journal_entry(
      NEW.organization_id,
      'Security deposit returned — ' || COALESCE(v_tenant, 'tenant') || ' (refund: ₹' || NEW.refund_amount || ', deduction: ₹' || NEW.deduction_amount || ')',
      'deposit_returned',
      NEW.id,
      NEW.property_id,
      NEW.unit_id,
      v_lines
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_deposit_returned ON security_deposits;
CREATE TRIGGER trg_deposit_returned
  AFTER UPDATE ON security_deposits
  FOR EACH ROW
  EXECUTE FUNCTION trg_deposit_returned_journal();

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. TRIGGER: Tenant Charge Paid → Journal Entry
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_tenant_charge_paid_journal()
RETURNS TRIGGER AS $$
DECLARE
  je_id UUID;
  v_lines JSONB := '[]'::JSONB;
  v_tenant TEXT;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    
    PERFORM seed_chart_of_accounts(NEW.organization_id);
    SELECT full_name INTO v_tenant FROM tenants WHERE id = NEW.tenant_id;

    -- Debit Cash (money came in)
    v_lines := v_lines || jsonb_build_object(
      'account_code', '1000', 'debit', NEW.amount, 'credit', 0,
      'description', 'Charge paid by ' || COALESCE(v_tenant, 'tenant')
    );
    -- Credit Maintenance Recovery (damage/charge income)
    v_lines := v_lines || jsonb_build_object(
      'account_code', '4200', 'debit', 0, 'credit', NEW.amount,
      'description', NEW.description
    );

    je_id := create_journal_entry(
      NEW.organization_id,
      'Tenant charge paid — ' || COALESCE(v_tenant, 'tenant') || ': ' || NEW.description,
      'tenant_charge',
      NEW.id,
      NEW.property_id,
      NEW.unit_id,
      v_lines
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_tenant_charge_paid ON tenant_charges;
CREATE TRIGGER trg_tenant_charge_paid
  BEFORE UPDATE ON tenant_charges
  FOR EACH ROW
  EXECUTE FUNCTION trg_tenant_charge_paid_journal();

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. REPORT: Trial Balance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_trial_balance(p_org_id UUID, p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  total_debit NUMERIC,
  total_credit NUMERIC,
  balance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.code,
    a.name,
    a.account_type,
    COALESCE(SUM(ll.debit), 0) AS total_debit,
    COALESCE(SUM(ll.credit), 0) AS total_credit,
    COALESCE(SUM(ll.debit), 0) - COALESCE(SUM(ll.credit), 0) AS balance
  FROM accounts a
  LEFT JOIN ledger_lines ll ON ll.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = ll.journal_entry_id 
    AND je.entry_date <= p_as_of
    AND je.is_reversed = false
  WHERE a.organization_id = p_org_id AND a.is_active = true
  GROUP BY a.code, a.name, a.account_type
  ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. REPORT: Income Statement (P&L) for a property or all
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_income_statement(
  p_org_id UUID, 
  p_from DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  p_to DATE DEFAULT CURRENT_DATE,
  p_property_id UUID DEFAULT NULL
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.code,
    a.name,
    a.account_type,
    CASE 
      WHEN a.account_type = 'revenue' THEN COALESCE(SUM(ll.credit), 0) - COALESCE(SUM(ll.debit), 0)
      WHEN a.account_type = 'expense' THEN COALESCE(SUM(ll.debit), 0) - COALESCE(SUM(ll.credit), 0)
    END AS amount
  FROM accounts a
  LEFT JOIN ledger_lines ll ON ll.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = ll.journal_entry_id 
    AND je.entry_date BETWEEN p_from AND p_to
    AND je.is_reversed = false
    AND (p_property_id IS NULL OR je.property_id = p_property_id)
  WHERE a.organization_id = p_org_id 
    AND a.account_type IN ('revenue', 'expense')
    AND a.is_active = true
  GROUP BY a.code, a.name, a.account_type
  HAVING COALESCE(SUM(ll.debit), 0) + COALESCE(SUM(ll.credit), 0) > 0
  ORDER BY a.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. REPORT: Real NOI (Net Operating Income)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_real_noi(
  p_org_id UUID,
  p_from DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  p_to DATE DEFAULT CURRENT_DATE,
  p_property_id UUID DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_revenue NUMERIC := 0;
  v_expense NUMERIC := 0;
BEGIN
  -- Sum all revenue accounts
  SELECT COALESCE(SUM(ll.credit - ll.debit), 0) INTO v_revenue
  FROM ledger_lines ll
  JOIN accounts a ON a.id = ll.account_id AND a.account_type = 'revenue'
  JOIN journal_entries je ON je.id = ll.journal_entry_id
  WHERE je.organization_id = p_org_id
    AND je.entry_date BETWEEN p_from AND p_to
    AND je.is_reversed = false
    AND (p_property_id IS NULL OR je.property_id = p_property_id);

  -- Sum all expense accounts
  SELECT COALESCE(SUM(ll.debit - ll.credit), 0) INTO v_expense
  FROM ledger_lines ll
  JOIN accounts a ON a.id = ll.account_id AND a.account_type = 'expense'
  JOIN journal_entries je ON je.id = ll.journal_entry_id
  WHERE je.organization_id = p_org_id
    AND je.entry_date BETWEEN p_from AND p_to
    AND je.is_reversed = false
    AND (p_property_id IS NULL OR je.property_id = p_property_id);

  RETURN v_revenue - v_expense;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- DONE! Finance Engine Phase 1 deployed.
-- ─────────────────────────────────────────────────────────────────────────────
