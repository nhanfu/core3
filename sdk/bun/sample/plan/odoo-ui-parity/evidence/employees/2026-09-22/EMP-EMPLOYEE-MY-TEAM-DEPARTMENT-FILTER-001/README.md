# EMP-EMPLOYEE-MY-TEAM-DEPARTMENT-FILTER-001 evidence

## Scope

Odoo's ordinary Employees list filters `My Team` and `My Department`,
implemented in Core3 as authenticated, same-company read projections on the
existing Employees list.

## Artifacts

- `odoo-analysis.md`: local Odoo 19 model/view trace and live-reference attempt.
- `functionality-checklist.md`: bounded source, API, scope, persistence, and UI
  acceptance cases.
- `source-comparison.md`: Odoo-to-Core3 mapping and deliberate compatibility
  fallback for legacy organization-parent fixtures.
- `gap-matrix.md`: before/after coverage and remaining evidence gap.
- `test-results.md`: focused test and static-check results.
- `verification.md`: browser attempt, exact blocker, and recapture requirements.

No screenshot is included: the authenticated Odoo user tab was already
borrowed by another bsk session, so visual parity is not claimed.

No credentials, cookies, tokens, or passwords are stored here.
