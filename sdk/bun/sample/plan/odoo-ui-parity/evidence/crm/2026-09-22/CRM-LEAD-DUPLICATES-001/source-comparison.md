# Source comparison

## Odoo 19

- `addons/crm/views/crm_lead_views.xml` adds the conditional form stat button
  `action_show_potential_duplicates`, showing `duplicate_lead_count` and
  opening the opportunities action with create disabled.
- `addons/crm/models/crm_lead.py` computes potential duplicates using email
  domain, normalized phone, and commercial-entity criteria, excluding the
  current record and retaining archived rows for the action.
- Live reference database: `core3_reference` at `http://localhost:8069`.
  The authenticated home page was Discuss; CRM was not installed/exposed and
  `/odoo/crm` resolved to Discuss. No live row-level CRM comparison was
  possible without mutating the reference database.

## Core3 before/after

Before this slice, `lead-detail` had no duplicate counter, duplicate datasource,
or stat navigation. `merge_leads` in `pages/leads.yaml` / `api/leads.yaml` is
not a duplicate-stat implementation and remains unchanged.

After this slice:

- `api/lead-detail.yaml` computes `duplicate_lead_count`.
- `pages/lead-detail.yaml` exposes the conditional `Similar Leads` stat.
- `api/lead-duplicates.yaml` and `pages/lead-duplicates.yaml` join by
  `page.id: crm-lead-duplicates` and expose CRM-owned read-only matching rows.
- `20260922100000-030-lead-duplicate-fixtures.yaml` adds an idempotent
  CRM-owned email index. The deterministic duplicate pair is the existing
  Globex demo data (`crm-demo-002` and `crm-forecast-002`), so report fixtures
  are not changed.

Core3 deliberately uses the available CRM-local normalized phone/email/customer
fields. Odoo's commercial-partner hierarchy and email-domain normalization are
not present in the CRM-local schema and remain a documented bounded difference.
