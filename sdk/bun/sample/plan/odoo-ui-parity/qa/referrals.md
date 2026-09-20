# referrals QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/referrals-desktop.png and referrals-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: source-limited provisional slice verified; parity sign-off blocked
QA slot: current-wave module owner
Module owner: referrals module owner
Verification trigger: feature-complete
Candidate commit: pending current-wave commit

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| REFERRALS-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |
| REFERRALS-CONTRACT-001 | Page/API discovery joins `referrals`, `referral-detail`, and `referral-analysis` through matching `page.id`; visible tabs remain text-labelled | Isolated `discoverPages` output from current service | passed |
| REFERRALS-DATA-002 | Default, filtered, empty, and detail queries use seeded DuckDB data | Inline Bun migration/query check; default 1 row, filtered 1 row, empty 0 rows, detail `REF/2026/0001` | passed |
| REFERRALS-CRUD-003 | Create, update, duplicate, and stale-write behavior persists through repository mutations | Inline Bun mutation check; create succeeded, update row version 1→2, duplicate `409 REFERRAL_NAME_EXISTS`, stale `409 STALE_RECORD` | passed |
| REFERRALS-PERM-004 | Datasource HTTP states enforce unauthorized, forbidden, and transport-error contracts | Inline Bun query check; `401 REFERRALS_UNAUTHORIZED`, `403 REFERRALS_FORBIDDEN`, `503 REFERRALS_UNAVAILABLE` | passed |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| — | Odoo `hr_referral` absent from live reference; exact menu/action/view and paired browser evidence unavailable | d429208b | Recheck after addon installation | blocked |

## Sign-off

- Functional: provisional slice passed; full module pending
- Permissions: provisional datasource states passed; full actor matrix pending
- Persistence/data integrity: create/update/stale checks passed; full CRUD/workflow pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
