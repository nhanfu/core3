# marketing-automation QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/marketing-automation-desktop.png and marketing-automation-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: blocked-before-authenticated-browser-signoff
QA slot: marketing-automation-qa
Module owner: marketing-automation module owner
Verification trigger: feature-complete
Candidate commit: edb34a2b262a5fb46677c5f2a54fbce6434075f1

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| MARKETING_AUTOMATION-001 | Live Odoo registry/menu inventory | Authenticated RPC inventory in module plan; Odoo module is uninstallable and menu surface absent | passed |
| MARKETING_AUTOMATION-002 | Page/API YAML fragments join through `page.id`; page files are layout-only | `bun test services/marketing-automation/tests/marketing-automation.increment.test.ts` — contract test | passed |
| MARKETING_AUTOMATION-003 | Deterministic migrations are idempotent and seed active workflow/enrollment records | Same focused test — migration idempotence and fixture assertions | passed |
| MARKETING_AUTOMATION-004 | Create/update/archive/restore/delete automation with validation and stale-row protection | Same focused test — CRUD, stale, archive, and restore assertions | passed |
| MARKETING_AUTOMATION-005 | Enrollment binds to automation, rejects inactive/duplicate/stale records, and updates counters transactionally | Same focused test — enrollment binding and duplicate-contact assertions | passed |
| MARKETING_AUTOMATION-006 | Publish → run → complete/pause workflow and permission boundaries | Same focused test — workflow and action-permission assertions | passed |
| MARKETING_AUTOMATION-007 | Authenticated Core3 desktop 1440x900 and mobile 390x844 list/detail/form states | No capture produced; checkpoint stopped before authenticated browser flow | blocked |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| — | Current-wave implementation not yet submitted | — | — | open |

## Sign-off

- Functional: focused backend/API slice passed
- Permissions: action contract boundaries passed; authenticated role boundary pending
- Persistence/data integrity: passed in-memory DuckDB; restart-backed runtime pending
- Desktop/mobile visual parity: pending
- Tester decision: blocked before authenticated browser QA; not fully signed off

## Checkpoint evidence — 2026-09-20

- Runtime preflight used the isolated command below. After moving the
  explicitly created stale `sample/coredb` directory to the desktop trash and
  recreating it, gateway `:4311`, service host `:4312`, and frontend `:4313`
  became reachable; `/api/modules` returned HTTP 200 and unauthenticated
  `/api/pages/automations` returned HTTP 401.
- Command: `PORT=4311 FRONTEND_PORT=4313 CORE3_TOPOLOGY=dev_inproc CORE3_AUTH_DB_PATH=/tmp/core3-odoo-parity/marketing-automation-qa-restart-4/auth.duckdb CORE3_MARKETING_AUTOMATION_DB_PATH=/tmp/core3-odoo-parity/marketing-automation-qa-restart-4/marketing-automation.duckdb bun run dev --db=ddb --demo-data --gateway`.
- Blocker: authenticated desktop/mobile list/detail/form and role-boundary
  evidence remains uncollected. No screenshot was produced in this checkpoint,
  and no browser sign-off is claimed. The next safe action is the authenticated
  Core3 browser matrix against the healthy runtime, followed by a second launch
  with `--demo-data` omitted to test restart persistence.

## Final runtime attempt — 2026-09-20

- A clean all-service database root under
  `/tmp/core3-odoo-parity/marketing-automation-browser-20260920` failed during
  startup before the service host opened: DuckDB reported `Cannot alter entry
  "email_mailings" because there are entries that depend on it.` This is a
  migration/runtime blocker, not Marketing Automation application evidence.
- The recovery runtime using a freshly recreated `sample/coredb` reached the
  gateway, service host, and frontend. Authenticated browser smoke then logged
  in as the admin fixture, redirected to `/apps`, and loaded
  `/marketing-automation/automations` with the three seeded rows and selected
  `Renewal reminder journey` detail. This proves only authenticated list/detail
  loading; no screenshot was captured.
- Clicking `New automation` did not complete within the browser timeout, so the
  form state was not validated. No create was committed, no restart assertion
  was run, and the dispatcher actor boundary was not exercised. Desktop/mobile
  captures therefore remain blocked and no paired Odoo claim is made.
