# Roles & Permissions

## Roles
- owner: Full access, billing, team management
- admin: Full access except billing
- manager: Access to all modules, cannot delete org data
- agent: Access to leads, tenants, properties (view)
- viewer: Read-only across all modules

## Module Access Matrix

Module              | owner | admin | manager | agent | viewer
--------------------|-------|-------|---------|-------|-------
Dashboard           |  RW   |  RW   |   RW    |  R    |  R
Properties          |  RW   |  RW   |   RW    |  R    |  R
Units               |  RW   |  RW   |   RW    |  R    |  R
Leases              |  RW   |  RW   |   RW    |  R    |  R
Tenants             |  RW   |  RW   |   RW    |  R    |  R
Leads               |  RW   |  RW   |   RW    |  RW   |  R
Maintenance         |  RW   |  RW   |   RW    |  RW   |  R
Documents           |  RW   |  RW   |   RW    |  R    |  R
AI Search           |  RW   |  RW   |   RW    |  RW   |  R
Analytics           |  RW   |  RW   |   RW    |  R    |  R
Invoices            |  RW   |  RW   |   RW    |  R    |  R
Alerts              |  RW   |  RW   |   RW    |  R    |  R
Integrations        |  RW   |  RW   |   R     |  -    |  -
Settings/Team       |  RW   |  RW   |   -     |  -    |  -
Settings/Billing    |  RW   |  -    |   -     |  -    |  -

All data is scoped to organization_id — no cross-tenant data access possible.