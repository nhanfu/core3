# referrals QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/referrals-desktop.png and referrals-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: source-limited CRUD/workflow/actor/browser slice verified; parity sign-off blocked
QA slot: current-wave module owner
Module owner: referrals module owner
Verification trigger: feature-complete
Candidate commit: pending current-wave QA evidence commit

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| REFERRALS-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Odoo `hr_referral` remains absent; paired Odoo evidence unavailable | blocked |
| REFERRALS-CONTRACT-001 | Page/API discovery joins `referrals`, `referral-detail`, and `referral-analysis` through matching `page.id`; visible tabs remain text-labelled | Isolated `discoverPages` output from current service | passed |
| REFERRALS-DATA-002 | Default, filtered, empty, and detail queries use seeded DuckDB data | Inline Bun migration/query check; default 1 row, filtered 1 row, empty 0 rows, detail `REF/2026/0001` | passed |
| REFERRALS-CRUD-003 | Create, update, duplicate, and stale-write behavior persists through repository mutations | Inline Bun mutation check; create succeeded, update row version 1→2, duplicate `409 REFERRAL_NAME_EXISTS`, stale `409 STALE_RECORD` | passed |
| REFERRALS-PERM-004 | Datasource HTTP states enforce unauthorized, forbidden, and transport-error contracts | Inline Bun query check; `401 REFERRALS_UNAUTHORIZED`, `403 REFERRALS_FORBIDDEN`, `503 REFERRALS_UNAVAILABLE` | passed |
| REFERRALS-CRUD-005 | Live authenticated HTTP create, edit, duplicate, invalid, stale-write, and delete review | `/tmp/core3-odoo-parity/referrals-20260920-rerun/api-actor-workflow.json` | passed |
| REFERRALS-WF-006 | Live Draft → Submitted → Hired → Rewarded workflow, invalid transition, and persistence after reread | `/tmp/core3-odoo-parity/referrals-20260920-rerun/api-actor-workflow.json` | passed |
| REFERRALS-ACTOR-007 | Unauthenticated and restricted dispatcher page/action boundaries | `/tmp/core3-odoo-parity/referrals-20260920-rerun/api-actor-workflow.json`; page `401`, restricted page/create/workflow `403` | passed |
| REFERRALS-BROWSER-008 | Authenticated Core3 list, detail, and analysis routes at desktop/mobile sizes | `/tmp/core3-odoo-parity/referrals-20260920-rerun/{desktop-list,mobile-list,desktop-detail,mobile-detail,desktop-analysis,mobile-analysis}.png` | passed |
| REFERRALS-AUTH-009 | Diagnose prior aborted `/api/auth/me` request using independent browser context/token per case | Fresh rerun: six `/api/auth/me` responses `200`, zero failed requests and console errors; prior `GET /api/auth/me net::ERR_ABORTED` was caused by login-shell navigation/reused-token harness sequencing | passed |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| — | Odoo `hr_referral` absent from live reference; exact menu/action/view and paired browser evidence unavailable | d429208b | Recheck after addon installation | blocked |
| REF-QA-001 | Initial browser harness reused one token across contexts and navigated away from `/web/login` while its login-page request was active; later checks recorded `GET /api/auth/me net::ERR_ABORTED` and login shell | — (QA harness sequencing) | Fresh independent login/token per context; all six `/api/auth/me` requests returned `200`, no failed requests or console errors | retested |

## Sign-off

- Functional: source-limited CRUD/workflow slice passed; full module pending
- Permissions: unauthenticated and restricted actor boundaries passed; full Odoo actor matrix pending
- Persistence/data integrity: live create/edit/delete/workflow reread passed; upgrade/restart durability pending
- Desktop/mobile route rendering: passed for Core3 at both viewports
- Desktop/mobile visual parity: pending because Odoo `hr_referral` is absent
- Tester decision: not signed off
