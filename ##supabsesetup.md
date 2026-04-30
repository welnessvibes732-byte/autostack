# Supabase Direct Connection — Webapp to Supabase

## Environment Variables (set in Antigravity)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

## Client Initialisation (runs once, imported everywhere)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.SUPABASE_URL
const supabaseAnon = process.env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnon)

---

## WHAT FRONTEND DOES DIRECTLY (Supabase JS SDK)

Auth:
- supabase.auth.signUp()
- supabase.auth.signInWithPassword()
- supabase.auth.signOut()
- supabase.auth.getSession()
- supabase.auth.onAuthStateChange()

Reads (all RLS-protected):
- supabase.from('properties').select('*')
- supabase.from('leases').select('*').eq('lease_status','active')
- supabase.from('tenants').select('*').eq('organization_id', orgId)
- supabase.from('leads').select('*').order('created_at', { ascending: false })
- supabase.from('maintenance_tickets').select('*').eq('status','open')
- supabase.from('alerts').select('*').eq('is_read', false)
- supabase.from('query_log').select('*').limit(20)

Inserts:
- supabase.from('properties').insert({ ...data })
- supabase.from('leads').insert({ ...data })
- supabase.from('maintenance_tickets').insert({ ...data })
- supabase.from('tenants').insert({ ...data })

Updates:
- supabase.from('leases').update({ lease_status: 'expired' }).eq('id', leaseId)
- supabase.from('alerts').update({ is_read: true }).eq('id', alertId)
- supabase.from('maintenance_tickets').update({ status: 'closed' }).eq('id', ticketId)

File uploads (Supabase Storage):
- supabase.storage.from('documents').upload(filePath, file)
- supabase.storage.from('documents').getPublicUrl(filePath)

Realtime (live dashboard):
- supabase.channel('alerts').on('postgres_changes', ...).subscribe()
- supabase.channel('leads').on('postgres_changes', ...).subscribe()
- supabase.channel('maintenance').on('postgres_changes', ...).subscribe()

---

## WHAT GOES THROUGH n8n (NOT direct from frontend)

Frontend never calls these directly:
- Document ingestion → n8n webhook
- Excel ingestion → n8n webhook
- RAG query → n8n webhook (returns answer)
- Lead auto-response → n8n handles internally
- WhatsApp sending → n8n handles internally
- Invoice processing → n8n webhook
- Scheduled alerts → n8n cron jobs

Pattern:
Frontend → POST to n8n webhook URL → n8n does heavy work → writes result to Supabase → Frontend reads result from Supabase via SDK

---

## ROW LEVEL SECURITY — CRITICAL

Every table needs RLS enabled and a policy like this:

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own org's data
CREATE POLICY "org_isolation" ON properties
  FOR ALL
  USING (
    organization_id = (
      SELECT organization_id FROM team_members
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

Apply same policy pattern to:
properties, units, leases, tenants, leads,
maintenance_tickets, vendors, invoices,
rent_payments, documents, alerts, query_log

---

## SERVICE KEY (backend/n8n only — never in frontend)

SUPABASE_SERVICE_KEY=your-service-role-key-here

This key bypasses RLS.
Only used in n8n workflows and server-side functions.
Never expose this in frontend code or Antigravity env variables
that get bundled into the client.