# CRM-LEAD-EMAIL-COMPOSER-001

Bounded Odoo CRM lead email-composer parity slice.

The Core3 contract covers single-lead and selected-lead composer actions,
permissioned templates, durable message history, and a `crm.email` activity
entry. It deliberately does not claim external SMTP delivery or binary
attachment handling.

Evidence files:

- `odoo-analysis.md` — Odoo 19 source mapping.
- `source-comparison.md` — source-backed gap and Core3 implementation.
- `functionality-checklist.md` — persistence, guard, and contract checks.
- `gap-matrix.md` — bounded remaining differences.
- `test-results.md` — focused test and repository blockers.
- `verification.md` — BrowserSkill attempt and blocker.
