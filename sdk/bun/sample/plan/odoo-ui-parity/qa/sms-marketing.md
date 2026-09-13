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

## Bounded QA execution (2026-09-13, candidate `7db5dde23c1258861fdd59341aff4d98e73782f0`)

- Focused regression: `bun test ./test/sms_marketing*.integration.test.ts --timeout 20000` — **13 passed, 93 expectations, 0 failed** across four files. This includes lifecycle transitions, stale completion rejection, durable row-version/counter assertions, list/contact permissions and failure contracts, and SMS analysis boundaries.
- Static workflow review: `schedule`, `send`, `complete`, and `cancel` are declared in `services/sms-marketing/pages/sms-workflow.yaml`; `complete_sms_campaign` is manager-only (`sms_marketing.manage`) and the detail page exposes `Mark Sent` only for `Sending`. All four mutations require `expected_row_version`, stale guards return 409 / `SMS_MAILING_STALE`, and updates require a changed row.
- Authenticated Core3 probe: direct single-module runtime `http://127.0.0.1:4330`, `admin@tms.local`, rendered `/sms-marketing/sms-campaigns` and `/sms-marketing/sms-campaigns/detail?id=sms-campaign-demo-004` at 1440x900. Four seeded campaigns rendered; the detail showed the Draft campaign and lifecycle controls. Probe reported zero `pageerror`, zero `requestfailed`, and `innerWidth=scrollWidth=bodyWidth=1440`.
- Desktop capture: `/tmp/core3-odoo-parity/sms-qa-7db5dde2-campaigns-desktop.png` (SHA-256 `46ebfc60329067fafde78be265325969fa054be23be3aeb5b819e20543ee38be`).
- UI transition limitation: the longer real-click sequence hung during the post-Schedule reload and was terminated. No browser claim is made for completed UI clicks, reload persistence, mobile rendering, actor/company mutation boundaries, or Odoo comparison. No mobile capture was produced in this bounded run.
- Persistence evidence is contract-level only: the focused test persisted `Sent`, `row_version=4`, and `delivered_count=24` after schedule → send → complete, and rejected a stale completion without changing the row.
- Permission evidence is contract/static only: `sms_marketing.write` guards send/schedule/cancel; `sms_marketing.manage` guards completion; `sms_marketing.read` protects campaign datasources. Manager/user/wrong-company/unauthenticated browser actor checks were not completed.
- Odoo evidence is unavailable: the module plan records local Odoo login rejection (`Wrong login/password`) and diagnostic captures only; no paired authenticated Odoo comparison is claimed.

## Audit and hygiene checks (2026-09-13)

- `bun scripts/audit-order-ui.ts` — passed: 659 pages, 668 routes, 1139 datasources.
- SMS SCSS compiled successfully to `/tmp/sms-qa-7db5dde2/index.css` using Sass; product CSS was not overwritten.
- `git diff --check 7db5dde2^ 7db5dde2 -- services/sms-marketing test/sms_marketing_campaigns.integration.test.ts` — passed with no whitespace errors.
- ESLint 9.39.5 reports the requested YAML/TS service path is ignored; no lint pass is claimed.

## Current regression evidence (2026-09-13)

- Focused SMS Marketing suite: `bun test ./test/sms_marketing*.integration.test.ts --timeout 20000` — 13 passed, 93 expectations, 0 failed across 4 files.
- Isolated runner `:4323` authenticated Campaigns at desktop 1440x900 with
  List/Kanban/Calendar/Graph tabs and at mobile 390x844 with grouped status
  cards. The desktop missing detail-page request was repaired; the retest has
  no HTTP errors, page errors, or horizontal overflow. Capture:
  `/tmp/core3-odoo-parity/sms-campaigns-desktop-fixed.png`.

Detailed execution matrix: [`test-plans/sms-marketing.md`](test-plans/sms-marketing.md). It is the module-level source for campaigns, lists, contacts, reports, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| SMS_MARKETING-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Candidate `7db5dde2` bounded QA; browser and Odoo gates remain open | pending |
| SMS-FUNC-001 | SMS campaign, list, contact, and analysis contract corpus | `bun test ./test/sms_marketing*.integration.test.ts` — 13 tests, 93 expectations | pass |
| SMS-BROWSER-001 | Authenticated campaign route and view-mode loading | Isolated runner `:4323`; desktop and mobile rendered without errors or overflow; detail form-view request now resolves after page-ID filename correction | pass for Core3 runtime; paired Odoo comparison remains open |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| SMS-BUG-001 | Desktop SMS Campaigns loaded `campaign-detail` from `form_view`, but the declared page ID was `sms-campaign-detail`, producing HTTP 404 | `a3af7332` and current alias repair | Renamed the SMS page file and added shared file-stem aliases; desktop retest has no failed requests | fixed |

## Sign-off

- Functional: pass at focused contract level; browser action sequence incomplete
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off; bounded evidence recorded, browser/Odoo gates remain open
