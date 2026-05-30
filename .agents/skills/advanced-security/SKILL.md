---
name: advanced-security-audit
description: Advanced skill to detect and fix critical vulnerabilities and non-production "toy-level" patterns in Next.js/Supabase architectures. Use this whenever the user asks for a security review, to fix architectural flaws, or to bring an app from prototype to production-grade.
---

# Advanced Security & Architecture Audit Skill

This skill is designed to elevate a prototype/toy-level architecture into a highly secure, enterprise-grade Next.js application. Follow these protocols strictly when auditing and fixing code.

## 1. Vulnerability: Exposed Service Role Keys in Webhooks
**The Problem:** API routes triggered by webhooks (like n8n or Stripe) often bypass Row-Level Security (RLS) by using the `SUPABASE_SERVICE_ROLE_KEY`. If these routes do not enforce strong authentication or validate incoming payloads, an attacker can manipulate any row in the database.
**The Fix:** 
1. **Require a Webhook Secret:** Always verify an Authorization header (e.g., `Bearer WEBHOOK_SECRET`).
2. **Schema Validation (Zod):** Never blindly accept `await req.json()`. Use Zod to explicitly define the expected payload, enforce types (e.g., UUIDs and Emails), and reject malicious or malformed input immediately.

*Example Fix Pattern:*
```typescript
import { z } from 'zod';
// 1. Zod schema
const payloadSchema = z.object({ id: z.string().uuid() });

export async function POST(req: Request) {
  // 2. Secret check
  if (req.headers.get('authorization') !== `Bearer ${process.env.WEBHOOK_SECRET}`) return new Response('Unauthorized', { status: 401 });
  // 3. Validation
  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) return new Response('Bad Request', { status: 400 });
  // 4. Safe Service Role usage
  const supabase = createClient(URL, SERVICE_KEY);
}
```

## 2. Vulnerability: Client-Side Data Dumping & "Toy-Level" Rendering
**The Problem:** Using `"use client"` at the top of a page and executing multiple `supabase.from().select()` queries inside a `useEffect` loop. This forces the browser to download massive datasets, exposes schema structures, and causes severe performance bottlenecks (waterfall loading). Relying on JavaScript `.filter().length` in the browser instead of SQL aggregations is a "toy-level" pattern.
**The Fix:**
1. **Move to Server Components:** In Next.js App Router, the `page.tsx` must be an `async` Server Component. Data fetching happens on the server before HTML is sent to the client.
2. **Use `@supabase/ssr`:** Initialize the Supabase client correctly for Server Components to respect cookies and sessions.
3. **Client-Server Split:** Pass only the required, sanitized data as props to smaller interactive Client Components (like charts or GSAP animations).

*Example Fix Pattern:*
```typescript
// app/dashboard/page.tsx (Server Component)
import { createClient } from '@/utils/supabase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createClient();
  // Data fetched securely on the server
  const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
  
  return <DashboardClient totalInvoices={count} />;
}
```

## 3. Vulnerability: Implicit Trust & Missing Error Boundaries
**The Problem:** Using empty `catch(e) { console.error(e) }` blocks leaves users staring at broken UI without context.
**The Fix:** Ensure every API endpoint returns standard error objects, and wrap Client Components in Error Boundaries with toast notifications for graceful degradation.
