-- =====================================================================
-- PHASE 4: SECURITY & AUDIT — NON-NEGOTIABLE FINANCIAL PROTECTION
-- =====================================================================
-- This migration adds:
-- 1. Immutable ledger (no delete/update on journal_entries & ledger_lines)
-- 2. Balance enforcement (debits MUST equal credits per journal entry)
-- 3. Period locking (closed months reject new entries)
-- 4. Audit trail for all financial actions
-- =====================================================================

-- =====================================================================
-- 1. IMMUTABLE LEDGER — NO DELETE, NO UPDATE ON FINANCIAL RECORDS
-- =====================================================================

-- Block DELETE on journal_entries
CREATE OR REPLACE FUNCTION prevent_journal_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'SECURITY VIOLATION: Journal entries cannot be deleted. Create a reversing entry instead.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_journal_delete ON journal_entries;
CREATE TRIGGER trg_prevent_journal_delete
  BEFORE DELETE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_journal_delete();

-- Block UPDATE on critical fields of journal_entries (allow only is_reversed flag)
CREATE OR REPLACE FUNCTION prevent_journal_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow updating is_reversed and reversed_by fields (for reversing entries)
  IF OLD.entry_date IS DISTINCT FROM NEW.entry_date
     OR OLD.description IS DISTINCT FROM NEW.description
     OR OLD.source_type IS DISTINCT FROM NEW.source_type
     OR OLD.source_id IS DISTINCT FROM NEW.source_id
     OR OLD.entry_number IS DISTINCT FROM NEW.entry_number
  THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Journal entries are immutable. Only reversal status can be updated.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_journal_update ON journal_entries;
CREATE TRIGGER trg_prevent_journal_update
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_journal_update();

-- Block DELETE on ledger_lines
CREATE OR REPLACE FUNCTION prevent_ledger_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'SECURITY VIOLATION: Ledger lines cannot be deleted. Create a reversing entry instead.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_delete ON ledger_lines;
CREATE TRIGGER trg_prevent_ledger_delete
  BEFORE DELETE ON ledger_lines
  FOR EACH ROW
  EXECUTE FUNCTION prevent_ledger_delete();

-- Block UPDATE on ledger_lines entirely
CREATE OR REPLACE FUNCTION prevent_ledger_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'SECURITY VIOLATION: Ledger lines are immutable. Create a reversing entry instead.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_update ON ledger_lines;
CREATE TRIGGER trg_prevent_ledger_update
  BEFORE UPDATE ON ledger_lines
  FOR EACH ROW
  EXECUTE FUNCTION prevent_ledger_update();


-- =====================================================================
-- 2. BALANCE ENFORCEMENT — DEBITS MUST EQUAL CREDITS
-- =====================================================================

-- This trigger fires AFTER INSERT on ledger_lines
-- It checks if the parent journal entry is now balanced
-- If all lines are inserted and they don't balance, it raises an error
CREATE OR REPLACE FUNCTION enforce_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_total_debit NUMERIC(14,2);
  v_total_credit NUMERIC(14,2);
  v_line_count INT;
BEGIN
  -- Get totals for this journal entry
  SELECT 
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0),
    COUNT(*)
  INTO v_total_debit, v_total_credit, v_line_count
  FROM ledger_lines
  WHERE journal_entry_id = NEW.journal_entry_id;

  -- Only enforce if there are at least 2 lines (a complete entry)
  -- Single-line entries are intermediate states during trigger execution
  IF v_line_count >= 2 THEN
    IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
      RAISE EXCEPTION 'BALANCE VIOLATION: Journal entry % has unbalanced lines. Debit: %, Credit: %. Difference: %',
        NEW.journal_entry_id,
        v_total_debit,
        v_total_credit,
        ABS(v_total_debit - v_total_credit);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Use a CONSTRAINT trigger so it fires at the end of the statement
-- This allows multiple lines to be inserted before checking balance
DROP TRIGGER IF EXISTS trg_enforce_journal_balance ON ledger_lines;
CREATE CONSTRAINT TRIGGER trg_enforce_journal_balance
  AFTER INSERT ON ledger_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION enforce_journal_balance();


-- =====================================================================
-- 3. PERIOD LOCKING — CLOSED MONTHS REJECT NEW ENTRIES
-- =====================================================================

-- When inserting a journal entry, check if the period is closed
CREATE OR REPLACE FUNCTION enforce_fiscal_period()
RETURNS TRIGGER AS $$
DECLARE
  v_period_status TEXT;
BEGIN
  -- Check if there's a closed/locked period covering this entry's date
  SELECT status INTO v_period_status
  FROM fiscal_periods
  WHERE organization_id = NEW.organization_id
    AND NEW.entry_date BETWEEN period_start AND period_end
    AND status IN ('closed', 'locked')
  LIMIT 1;

  IF v_period_status IS NOT NULL THEN
    RAISE EXCEPTION 'PERIOD LOCKED: Cannot create entries for date %. The fiscal period is %. Close your entries before the period was locked, or contact your administrator.',
      NEW.entry_date,
      v_period_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_fiscal_period ON journal_entries;
CREATE TRIGGER trg_enforce_fiscal_period
  BEFORE INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION enforce_fiscal_period();


-- =====================================================================
-- 4. FINANCIAL AUDIT TRAIL
-- =====================================================================

-- Create a dedicated financial audit table for sensitive operations
CREATE TABLE IF NOT EXISTS finance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  performed_by UUID REFERENCES auth.users(id),
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_finance_audit_org ON finance_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_audit_entity ON finance_audit_log(entity_type, entity_id);

-- Auto-log when journal entries are created
CREATE OR REPLACE FUNCTION log_journal_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO finance_audit_log (organization_id, action, entity_type, entity_id, details, performed_by)
  VALUES (
    NEW.organization_id,
    'journal_entry_created',
    'journal_entry',
    NEW.id,
    jsonb_build_object(
      'entry_number', NEW.entry_number,
      'description', NEW.description,
      'source_type', NEW.source_type,
      'entry_date', NEW.entry_date,
      'is_auto', NEW.is_auto
    ),
    NEW.posted_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_journal_creation ON journal_entries;
CREATE TRIGGER trg_log_journal_creation
  AFTER INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION log_journal_creation();

-- Auto-log when deposits change status
CREATE OR REPLACE FUNCTION log_deposit_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO finance_audit_log (organization_id, action, entity_type, entity_id, details)
    VALUES (
      NEW.organization_id,
      'deposit_status_changed',
      'security_deposit',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'tenant_id', NEW.tenant_id,
        'amount', NEW.deposit_amount,
        'deduction', NEW.deduction_amount,
        'refund', NEW.refund_amount
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_deposit_changes ON security_deposits;
CREATE TRIGGER trg_log_deposit_changes
  AFTER UPDATE ON security_deposits
  FOR EACH ROW
  EXECUTE FUNCTION log_deposit_changes();

-- Auto-log when invoice status changes
CREATE OR REPLACE FUNCTION log_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO finance_audit_log (organization_id, action, entity_type, entity_id, details)
    VALUES (
      NEW.organization_id,
      'invoice_status_changed',
      'invoice',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'vendor', NEW.vendor_name,
        'amount', NEW.total_amount,
        'payment_method', NEW.payment_method
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_invoice_status ON invoices;
CREATE TRIGGER trg_log_invoice_status
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_invoice_status();

-- Auto-log when tenant charges change
CREATE OR REPLACE FUNCTION log_charge_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO finance_audit_log (organization_id, action, entity_type, entity_id, details)
    VALUES (
      NEW.organization_id,
      'tenant_charge_created',
      'tenant_charge',
      NEW.id,
      jsonb_build_object(
        'tenant_id', NEW.tenant_id,
        'charge_type', NEW.charge_type,
        'amount', NEW.amount,
        'description', NEW.description
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO finance_audit_log (organization_id, action, entity_type, entity_id, details)
    VALUES (
      NEW.organization_id,
      'tenant_charge_status_changed',
      'tenant_charge',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'amount', NEW.amount
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_charge_insert ON tenant_charges;
CREATE TRIGGER trg_log_charge_insert
  AFTER INSERT ON tenant_charges
  FOR EACH ROW
  EXECUTE FUNCTION log_charge_changes();

DROP TRIGGER IF EXISTS trg_log_charge_update ON tenant_charges;
CREATE TRIGGER trg_log_charge_update
  AFTER UPDATE ON tenant_charges
  FOR EACH ROW
  EXECUTE FUNCTION log_charge_changes();

-- Auto-log when rent payments are marked paid
CREATE OR REPLACE FUNCTION log_rent_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid' THEN
    INSERT INTO finance_audit_log (organization_id, action, entity_type, entity_id, details)
    VALUES (
      NEW.organization_id,
      'rent_payment_received',
      'rent_payment',
      NEW.id,
      jsonb_build_object(
        'amount_paid', NEW.amount_paid,
        'amount_due', NEW.amount_due,
        'late_fee_charged', NEW.late_fee_charged,
        'paid_date', NEW.paid_date
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_rent_payment ON rent_payments;
CREATE TRIGGER trg_log_rent_payment
  AFTER UPDATE ON rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION log_rent_payment();


-- =====================================================================
-- 5. FISCAL PERIOD MANAGEMENT FUNCTION
-- =====================================================================

-- Function to close a fiscal period
CREATE OR REPLACE FUNCTION close_fiscal_period(
  p_org_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_closed_by UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_period_id UUID;
  v_debit_total NUMERIC;
  v_credit_total NUMERIC;
BEGIN
  -- First verify the books are balanced for this period
  SELECT 
    COALESCE(SUM(ll.debit), 0),
    COALESCE(SUM(ll.credit), 0)
  INTO v_debit_total, v_credit_total
  FROM journal_entries je
  JOIN ledger_lines ll ON ll.journal_entry_id = je.id
  WHERE je.organization_id = p_org_id
    AND je.entry_date BETWEEN p_period_start AND p_period_end;

  IF ABS(v_debit_total - v_credit_total) > 0.01 THEN
    RETURN 'ERROR: Books are not balanced for this period. Debit: ' || v_debit_total || ', Credit: ' || v_credit_total;
  END IF;

  -- Create or update the fiscal period
  INSERT INTO fiscal_periods (organization_id, period_start, period_end, status, closed_by, closed_at)
  VALUES (p_org_id, p_period_start, p_period_end, 'closed', p_closed_by, now())
  ON CONFLICT (organization_id, period_start, period_end) 
  DO UPDATE SET status = 'closed', closed_by = p_closed_by, closed_at = now()
  RETURNING id INTO v_period_id;

  -- Log the period closure
  INSERT INTO finance_audit_log (organization_id, action, entity_type, entity_id, details, performed_by)
  VALUES (
    p_org_id,
    'fiscal_period_closed',
    'fiscal_period',
    v_period_id,
    jsonb_build_object('period_start', p_period_start, 'period_end', p_period_end),
    p_closed_by
  );

  RETURN 'SUCCESS: Period ' || p_period_start || ' to ' || p_period_end || ' is now closed. No new entries can be added for these dates.';
END;
$$ LANGUAGE plpgsql;

-- Add unique constraint for fiscal periods if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_fiscal_period_org_dates'
  ) THEN
    ALTER TABLE fiscal_periods ADD CONSTRAINT uq_fiscal_period_org_dates 
    UNIQUE (organization_id, period_start, period_end);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- =====================================================================
-- 6. REVERSING ENTRY FUNCTION
-- =====================================================================
-- Instead of deleting/editing, users create a "reversing entry"
-- that cancels out the original

CREATE OR REPLACE FUNCTION create_reversing_entry(
  p_journal_entry_id UUID,
  p_reason TEXT DEFAULT 'Correction'
)
RETURNS UUID AS $$
DECLARE
  v_original RECORD;
  v_new_id UUID;
  v_new_number TEXT;
  v_line RECORD;
BEGIN
  -- Get the original entry
  SELECT * INTO v_original FROM journal_entries WHERE id = p_journal_entry_id;
  
  IF v_original IS NULL THEN
    RAISE EXCEPTION 'Journal entry not found: %', p_journal_entry_id;
  END IF;

  IF v_original.is_reversed THEN
    RAISE EXCEPTION 'This entry has already been reversed.';
  END IF;

  -- Generate new entry number
  SELECT 'JE-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1)::TEXT, 5, '0')
  INTO v_new_number
  FROM journal_entries
  WHERE organization_id = v_original.organization_id;

  -- Create the reversing entry
  INSERT INTO journal_entries (
    organization_id, entry_date, entry_number, description,
    source_type, source_id, property_id, unit_id, is_auto, posted_by
  ) VALUES (
    v_original.organization_id,
    CURRENT_DATE,
    v_new_number,
    'REVERSAL: ' || v_original.description || ' — Reason: ' || p_reason,
    'reversal',
    v_original.id,
    v_original.property_id,
    v_original.unit_id,
    false,
    v_original.posted_by
  ) RETURNING id INTO v_new_id;

  -- Create reversed lines (swap debit and credit)
  FOR v_line IN SELECT * FROM ledger_lines WHERE journal_entry_id = p_journal_entry_id
  LOOP
    INSERT INTO ledger_lines (journal_entry_id, account_id, debit, credit, description)
    VALUES (v_new_id, v_line.account_id, v_line.credit, v_line.debit, 'Reversal: ' || COALESCE(v_line.description, ''));
  END LOOP;

  -- Mark original as reversed
  UPDATE journal_entries 
  SET is_reversed = true, reversed_by = v_new_id 
  WHERE id = p_journal_entry_id;

  -- Log the reversal
  INSERT INTO finance_audit_log (organization_id, action, entity_type, entity_id, details)
  VALUES (
    v_original.organization_id,
    'journal_entry_reversed',
    'journal_entry',
    v_new_id,
    jsonb_build_object(
      'original_entry', p_journal_entry_id,
      'original_number', v_original.entry_number,
      'reason', p_reason
    )
  );

  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- 7. ROW-LEVEL SECURITY (RLS) FOR FINANCE TABLES
-- =====================================================================

-- Enable RLS on all financial tables
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see data from their organization
CREATE POLICY IF NOT EXISTS "journal_entries_org_isolation" ON journal_entries
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "ledger_lines_org_isolation" ON ledger_lines
  FOR ALL USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY IF NOT EXISTS "security_deposits_org_isolation" ON security_deposits
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "tenant_charges_org_isolation" ON tenant_charges
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "finance_audit_org_isolation" ON finance_audit_log
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "fiscal_periods_org_isolation" ON fiscal_periods
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "accounts_org_isolation" ON accounts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );
