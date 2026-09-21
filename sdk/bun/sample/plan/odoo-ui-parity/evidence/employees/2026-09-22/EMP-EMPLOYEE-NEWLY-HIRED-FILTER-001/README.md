# EMP-EMPLOYEE-NEWLY-HIRED-FILTER-001 evidence

## Scope

Odoo's searchable `hr.employee.newly_hired` field and the Employees search-view
filter labelled `Newly Hired`, implemented in Core3 as a read-only,
company-scoped API projection and page filter.

## Artifacts

- `odoo-desktop.png`: authenticated Odoo Employees action at 1440x900.
- `odoo-desktop-filtered.png`: authenticated Odoo filter/result state; the
  selected filter returns 8 records.
- `odoo-mobile.png`: authenticated Odoo filtered result at 390x844 touch
  emulation; the result contains 8 records.
- `odoo-mobile-filtered.png`: authenticated Odoo mobile filter menu with
  `Newly Hired` checked.
- `core3-desktop-empty.png`, `core3-mobile-empty.png`: authenticated Core3
  route at 1440x900 and 390x844.
- `odoo-analysis.md`, `functionality-checklist.md`, `source-comparison.md`,
  `gap-matrix.md`, `test-results.md`, and `verification.md`: traceable source,
  implementation, test, and browser records.

## Blocker and interpretation

Core3's authenticated local QA user is scoped to `Core3 Demo Company`; the
deterministic employee fixture used by the focused API test is scoped to
`Core3 Vietnam`, so the browser route correctly renders the empty state. The
feature is API/database verified and visually route-verified, but a populated
Core3 browser comparison is not claimed. Odoo is populated and authenticated.
Browser noise includes the shared invalid extension endpoint and Odoo optional
app-icon 404s; no feature request failure is used as a pass claim.

No credentials, cookies, or tokens are stored here.
