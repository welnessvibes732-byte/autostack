-- ============================================================
-- FIX: Run this in Supabase SQL Editor for project tmxyygqnubhpatxcumca
-- ============================================================

-- STEP 1: Drop ALL existing recursive policies
DROP POLICY IF EXISTS "team_members_isolation" ON team_members;
DROP POLICY IF EXISTS "org_isolation" ON organizations;
DROP POLICY IF EXISTS "org_isolation" ON properties;
DROP POLICY IF EXISTS "org_isolation" ON units;
DROP POLICY IF EXISTS "org_isolation" ON tenants;
DROP POLICY IF EXISTS "org_isolation" ON leases;
DROP POLICY IF EXISTS "org_isolation" ON documents;
DROP POLICY IF EXISTS "org_isolation" ON leads;
DROP POLICY IF EXISTS "org_isolation" ON vendors;
DROP POLICY IF EXISTS "org_isolation" ON maintenance_tickets;
DROP POLICY IF EXISTS "org_isolation" ON invoices;
DROP POLICY IF EXISTS "org_isolation" ON rent_payments;
DROP POLICY IF EXISTS "org_isolation" ON alerts;
DROP POLICY IF EXISTS "org_isolation" ON audit_log;
DROP POLICY IF EXISTS "org_isolation" ON query_log;
DROP POLICY IF EXISTS "org_isolation" ON subscriptions;

-- STEP 2: Create a SECURITY DEFINER function — this breaks the recursion loop
-- It runs with elevated privileges, bypassing RLS when looking up org IDs
CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS TABLE(org_id UUID)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT organization_id FROM team_members WHERE user_id = auth.uid()
$$;

-- STEP 3: Recreate team_members policy — simple, non-recursive
-- Users can only see their OWN row in team_members
CREATE POLICY "team_members_own_row" ON team_members
  FOR ALL
  USING (user_id = auth.uid());

-- STEP 4: Recreate organizations policy — owner OR member
CREATE POLICY "org_owner_access" ON organizations
  FOR ALL
  USING (
    owner_id = auth.uid()
    OR id IN (SELECT org_id FROM get_my_org_ids())
  );

-- STEP 5: Recreate all other table policies using the safe function
CREATE POLICY "org_isolation" ON properties
  FOR ALL USING (organization_id IN (SELECT org_id FROM get_my_org_ids()));

CREATE POLICY "org_isolation" ON units
  FOR ALL USING (organization_id IN (SELECT org_id FROM get_my_org_ids()));

CREATE POLICY "org_isolation" ON tenants
  FOR ALL USING (organization_id IN (SELECT org_id FROM get_my_org_ids()));

CREATE POLICY "org_isolation" ON leases
  FOR ALL USING (organization_id IN (SELECT org_id FROM get_my_org_ids()));

CREATE POLICY "org_isolation" ON documents
  FOR ALL USING (organization_id IN (SELECT org_id FROM get_my_org_ids()));

CREATE POLICY "org_isolation" ON leads
  FOR ALL USING (organization_id IN (SELECT org_id FROM get_my_org_ids()));

CREATE POLICY "org_isolation" ON vendors
  FOR ALL USING (organization_id IN (SELECT org_id FROM get_my_org_ids()));

CREATE POLICY "org_isolation" ON maintenance_tickets
  FOR ALL USING (organization_id IN (SELECT org_id FROM get_my_org_ids()));

CREATE POLICY "org_isolation" ON invoices
  FOR ALL USING (organization_id IN (SELECT org_id FROM get_my_org_ids()));

CREATE POLICY "org_isolation" ON rent_payments
  FOR ALL USING (organization_id IN (SELECT org_id FROM get_my_org_ids()));

CREATE POLICY "org_isolation" ON alerts
  FOR ALL USING (organization_id IN (SELECT org_id FROM get_my_org_ids()));

CREATE POLICY "org_isolation" ON audit_log
  FOR ALL USING (organization_id IN (SELECT org_id FROM get_my_org_ids()));

-- Optional tables (only if they exist)
-- CREATE POLICY "org_isolation" ON query_log FOR ALL USING (organization_id IN (SELECT org_id FROM get_my_org_ids()));
-- CREATE POLICY "org_isolation" ON subscriptions FOR ALL USING (organization_id IN (SELECT org_id FROM get_my_org_ids()));
