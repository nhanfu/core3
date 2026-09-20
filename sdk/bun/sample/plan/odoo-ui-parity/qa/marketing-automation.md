# marketing-automation QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/marketing-automation-desktop.png and marketing-automation-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: ready-for-test
QA slot: marketing-automation-qa
Module owner: marketing-automation module owner
Verification trigger: feature-complete
Candidate commit: none

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| MARKETING_AUTOMATION-001 | Live Odoo registry/menu inventory | Authenticated RPC inventory in module plan; Odoo module is uninstallable and menu surface absent | passed |
| MARKETING_AUTOMATION-002 | Page/API YAML fragments join through `page.id`; page files are layout-only | Focused discovery/contract test | pending |
| MARKETING_AUTOMATION-003 | Deterministic migrations are idempotent and seed active workflow/enrollment records | Migration integration test | pending |
| MARKETING_AUTOMATION-004 | Create/update/archive/restore/delete automation with validation and stale-row protection | API integration test | pending |
| MARKETING_AUTOMATION-005 | Enrollment binds to automation, rejects inactive/duplicate/stale records, and updates counters transactionally | API integration test | pending |
| MARKETING_AUTOMATION-006 | Publish → run → complete/pause workflow and permission boundaries | Workflow/permission integration test | pending |
| MARKETING_AUTOMATION-007 | Authenticated Core3 desktop 1440x900 and mobile 390x844 list/detail/form states | `/tmp/core3-odoo-parity/marketing-automation/` captures | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| — | Current-wave implementation not yet submitted | — | — | open |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
