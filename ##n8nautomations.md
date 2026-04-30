# n8n Workflows Required

## Ingestion Workflows
1. Document Ingestion — Triggered by Supabase Storage webhook on upload
2. Excel/CSV Ingestion — Triggered by file upload (spreadsheet detected)
3. Amendment Handler — Hash change detection, re-index only changed chunks
4. Gmail Ingestion — Monitor Gmail for attachments, auto-ingest

## Operational Workflows
5. Lease Expiry Alerts — Daily 8am, check 30/60/90 day windows, WhatsApp + email
6. Lead Auto-Response — Webhook on new lead, respond in <60 seconds
7. Lead Follow-Up Sequence — Day 1, Day 3, Day 7 automated messages
8. Maintenance Assignment — Auto-assign vendor by category, notify via WhatsApp
9. Maintenance Follow-Up — 24hr check if vendor has not confirmed
10. Invoice Processing — Extract, match work order, anomaly check, route for approval
11. Rent Collection Reminders — 3 days before due, on due date, overdue escalation
12. Occupancy Alert — Daily check, alert if any property drops below threshold

## Reporting Workflows
13. Daily Summary — 8am briefing to team leads via WhatsApp
14. Weekly Report — Monday morning PDF summary to management email
15. Monthly Analytics — Generate and email full performance report

## System Workflows
16. Qdrant Collection Setup — On new org signup, create isolated collections
17. Subscription Enforcement — Check unit limits on property add, block if exceeded
18. Audit Logger — Capture all entity changes to audit_log