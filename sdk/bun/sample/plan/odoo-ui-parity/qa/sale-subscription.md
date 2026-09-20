# sale-subscription QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/sale-subscription-desktop.png and sale-subscription-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: Core3 slice verified; paired Odoo parity blocked
QA slot: current five-worker wave, module-owner execution
Module owner: sale-subscription module owner
Verification trigger: authenticated actor and responsive route evidence
Candidate commit: 56f07523

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| SALE_SUBSCRIPTION-CONTRACT-001 | Every page joins a separate API/action contract by `page.id` and retains page-only layout | Isolated schema validation plus `762d127d` | pass |
| SALE_SUBSCRIPTION-DATA-001 | Deterministic subscriptions, invoices, and plans survive idempotent migration | Bun repository assertions: 2/1/2 rows after rerun | pass |
| SALE_SUBSCRIPTION-CRUD-001 | Create and edit quotation/paused subscriptions; reject invalid dates/revenue and edits in progress | Create/edit repository mutations and invalid-date rejection | pass |
| SALE_SUBSCRIPTION-WORKFLOW-001 | Confirm, pause, close, churn; reject forbidden transitions and create only one activation invoice | Lifecycle mutation assertions and activation invoice count | pass |
| SALE_SUBSCRIPTION-BILLING-001 | Generate and post recurring invoices; advance the next invoice date and reject non-draft/non-active operations | Generate/post mutation persistence assertions | pass |
| SALE_SUBSCRIPTION-PERM-001 | Enforce read/write/manage boundaries, including direct plan and lifecycle mutations | `bun test test/sale_subscription_actor_boundary.integration.test.ts` passed; authenticated runtime checks returned reader lifecycle 403, writer plan 403, manager plan 200, writer lifecycle 200 | pass for Core3 |
| SALE_SUBSCRIPTION-RESPONSIVE-001 | Core3 authenticated subscription routes render at 1440x900 and 390x844 without blank/redirect/error/overflow | Playwright fallback captured `/tmp/core3-odoo-parity/sale-subscription-20260920/{desktop,mobile}.png`; both canonicalized to `/sale-subscription/subscriptions`, had no console/page/request errors, and reported no horizontal overflow | pass for Core3 |
| SALE_SUBSCRIPTION-ODOO-REF-001 | Compare menu/action/view/layout states against the live Odoo reference | Reference inventory proves addon unavailable | blocked |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| SALE_SUBSCRIPTION-QA-001 | In-process action permission failures are thrown as structured 403s while the gateway serializes them as HTTP 403 | Focused actor test normalizes the in-process response boundary; live gateway actor checks independently returned HTTP 403/200 | closed |

## Sign-off

- Functional: pass for the committed repository slice
- Permissions: pass for the Core3 actors exercised; paired Odoo group parity remains blocked by the unavailable addon
- Persistence/data integrity: pass for the committed repository slice
- Desktop/mobile Core3 route evidence: pass at 1440x900 and 390x844; captures remain outside Git under `/tmp/core3-odoo-parity`
- Odoo menu/action/view and paired visual parity: blocked by unavailable `sale_subscription` addon
- Tester decision: Core3 slice signed off for this evidence increment; full Odoo parity not signed off

## 2026-09-20 evidence

- `bun test test/sale_subscription_actor_boundary.integration.test.ts`: 1 pass, 9 assertions, 0 failures. The test uses authenticated actor claims against the YAML API and verifies the permission boundary plus lifecycle persistence/invoice creation.
- Runtime actor smoke used the authenticated Core3 gateway on `http://127.0.0.1:3011` with the local QA accounts without printing credentials or tokens. Admin page load returned HTTP 200; dispatcher lifecycle returned HTTP 403 (`subscriptions.write`); dispatcher plan creation returned HTTP 403 (`subscriptions.manage`); admin plan creation returned HTTP 200.
- Browser fallback used the installed Playwright package with `/usr/bin/google-chrome` because `js_repl` was unavailable. At both 1440x900 and 390x844, the authenticated route ended at `http://127.0.0.1:3011/sale-subscription/subscriptions`, rendered `Subscriptions`, `New subscription`, `List`, `Kanban`, `Pivot`, `Graph`, and `Calendar`, and showed the deterministic subscription rows/cards. Both contexts measured viewport/content widths of 1440/1440 and 390/390, with no horizontal overflow, console errors, page errors, or failed requests.
- Captures: `/tmp/core3-odoo-parity/sale-subscription-20260920/desktop.png` and `mobile.png`. They are deliberately not tracked in Git.
