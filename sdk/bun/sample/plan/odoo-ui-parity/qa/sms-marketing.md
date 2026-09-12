# sms-marketing QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/sms-marketing-desktop.png and sms-marketing-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable sms-marketing assignment (pending wave dispatch)
Module owner: sms-marketing module owner
Verification trigger: feature-complete
Candidate commit: working tree after SMS Marketing QA planning

## Current regression evidence (2026-09-13)

- Focused SMS Marketing suite: `bun test ./test/sms_marketing*.integration.test.ts --timeout 20000` — 12 passed, 85 assertions, 0 failed across 4 files.
- Isolated runner `:4323` authenticated Campaigns at desktop 1440x900 with
  List/Kanban/Calendar/Graph tabs and at mobile 390x844 with grouped status
  cards. The desktop missing detail-page request was repaired; the retest has
  no HTTP errors, page errors, or horizontal overflow. Capture:
  `/tmp/core3-odoo-parity/sms-campaigns-desktop-fixed.png`.

Detailed execution matrix: [`test-plans/sms-marketing.md`](test-plans/sms-marketing.md). It is the module-level source for campaigns, lists, contacts, reports, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| SMS_MARKETING-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |
| SMS-FUNC-001 | SMS campaign, list, contact, and analysis contract corpus | `bun test ./test/sms_marketing*.integration.test.ts` — 12 tests, 85 assertions | pass |
| SMS-BROWSER-001 | Authenticated campaign route and view-mode loading | Isolated runner `:4323`; desktop and mobile rendered without errors or overflow; detail form-view request now resolves after page-ID filename correction | pass for Core3 runtime; paired Odoo comparison remains open |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| SMS-BUG-001 | Desktop SMS Campaigns loaded `campaign-detail` from `form_view`, but the declared page ID was `sms-campaign-detail`, producing HTTP 404 | `working tree` | Renamed page file to `sms-campaign-detail.yaml`, updated reference/test path; desktop retest has no failed requests | fixed |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
