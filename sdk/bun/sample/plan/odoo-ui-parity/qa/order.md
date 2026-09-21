# order QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/order-desktop.png and order-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA slot: wave-1 order assignment
Module owner: order module owner
Verification trigger: merge-candidate
Candidate commit: ef85c2a7
QA state: qa-in-progress

## QA-5 candidate verification: `a284eb78` (2026-09-13)

- Candidate under test: `feat(order): add bulk invoice creation action` at
  `a284eb78`.
- Exact bounded suite: `bun test ./test/sales_orders_to_invoice.integration.test.ts
  --timeout 120000` — **3 passed, 18 assertions, 0 failures** in 26.02s.
- Sales regression: `bun test ./test/sales*.integration.test.ts --timeout
  120000` — **21 passed, 191 assertions, 0 failures** across 8 files in 99.14s.
- Authenticated desktop browser (`1440x900`, admin demo actor): `/order/to-invoice`
  rendered 256 rows; two rows were selected, the native confirmation displayed
  `Create invoices for  selected orders?`, and the confirmed request to
  `/api/mutate` returned HTTP 200. There were 0 console errors and 0 page errors.
- Existing authenticated route-smoke evidence covers mobile (`390x844`) with no
  blank/redirect, request/page errors, or horizontal overflow; a fresh mobile
  bulk-action interaction was not run in this event.
- Permission boundary: unauthenticated `/api/pages/sale-to-invoice` returned
  HTTP 401; unauthenticated `/api/mutate` returned HTTP 401. The seeded Fleet
  actor is a dispatcher with `orders.read` and `orders.write`, so it is not a
  valid negative actor for this action.
- Cross-module finding `ORDER-QA-003`: the candidate bulk mutation inserts
  `sale_invoices` only and does not call `accounting.invoices.create_from_source`
  or populate `accounting_invoice_id`; Accounting-side invoice creation/linkage
  is therefore not proven and remains open.
- No product code was changed by QA-5. This worktree contains only this QA
  ledger update and the existing candidate files.

Detailed execution matrix: [`test-plans/order.md`](test-plans/order.md). The
module-scoped Sales suite passes; the remaining failure is repository-wide
discovery of datasource contracts outside Order ownership.

## Test cases

## QA-6 candidate verification: `61422c4e` (2026-09-13)

- Candidate under test: `fix(order): link bulk invoices through accounting service` at `61422c4e`.
- Focused bounded suite: `bun test ./test/sales_orders_to_invoice.integration.test.ts --timeout 120000`. All 4 tests passed when run as the complete case set: declaration/permission, Accounting-linked draft creation with duplicate and empty-selection guards, mixed-branch/already-invoiced atomic rejection, and Accounting rejection rollback with stale guard. The focused assertions cover `accounting.invoices.create_from_source`, persisted `sale_invoices.accounting_invoice_id`, source metadata, no partial local writes, `orders.write`, branch scope, duplicate protection, and stale-selection contract.
- Sales regression probe: `bun test ./test/sales*.integration.test.ts --timeout 120000` was intentionally stopped after it remained active. Before termination, 12 Sales tests had passed: customer report 3, order detail 4, Orders to Invoice 4, and Orders to Upsell 1. No final regression summary is claimed.
- Audit: `bun run audit` passed — 659 pages, 668 routes, 1139 datasources.
- Diff check: `git diff --check HEAD^ HEAD` passed with no output.
- Lint: targeted `bunx eslint services/order/api/sale-to-invoice.yaml test/sales_orders_to_invoice.integration.test.ts ../packages/server/src/yaml-mutation-runtime.ts` returned no lint errors; ESLint emitted one warning that the YAML file is ignored because no configuration matches it.
- Product code was not changed by QA. Only this ledger and `progress/order.md` are changed for the QA commit.
- Browser/restart/reference boundary: no authenticated Core3 browser session was available for this bounded run, so fresh desktop/mobile interaction, restricted actor, reload/restart persistence, and paired Odoo captures were not executed. Existing desktop evidence is from the predecessor candidate and is not retested evidence for `61422c4e`; no new captures are claimed.

| Test ID | Odoo action/route | Core3 route | Functional scenario/state | Evidence | Result | Date |
| --- | --- | --- | --- | --- | --- | --- |
| ORDER-FUNC-001 | `sale.action_quotations` / `sale.action_orders` | `/order/quotations`, `/order/sales-orders` | Read populated orders, open the Sales order form, and exercise draft → sent → confirmed → cancelled transitions with row-version guards | `bun test test/sales_order_detail.integration.test.ts` — 4 tests, 32 assertions | pass | 2026-09-12 |
| ORDER-FUNC-002 | `sale.action_orders_upselling` | `/order/orders-to-upsell` | Query deterministic upsell row, search-empty, branch scope, explicit empty state, and transport error | `bun test test/sales_orders_to_upsell.integration.test.ts` — 2 tests, 15 assertions | pass | 2026-09-12 |
| ORDER-FUNC-009 | `sale.action_orders_to_invoice` | `/order/to-invoice` | Select approved orders and create draft invoices atomically; refresh the queue state and reject empty, duplicate, already-invoiced, or out-of-scope selections | `bun test test/sales_orders_to_invoice.integration.test.ts` — 3 tests, 18 assertions | pass | 2026-09-13 |
| ORDER-QA-006 | `sale.action_orders_to_invoice` | `/order/to-invoice` | Candidate `61422c4e`: Accounting source creation/linkage, rollback, duplicate/branch/stale/permission guards, and bounded Sales regression | Focused case set 4/4 pass; audit 659/668/1139; diff check clean; Sales glob stopped after 12 passes | pass (bounded contract/static); browser gates open | 2026-09-13 |
| ORDER-QA-005 | `sale.action_orders_to_invoice` | `/order/to-invoice` | Authenticated desktop selection, confirmation, mutation response, and browser error boundary | `/tmp/order-qa-bulk-invoice-desktop.png`; 2 selected; `/api/mutate` HTTP 200; 0 console/page errors | pass (desktop) | 2026-09-13 |
| ORDER-FUNC-003 | `sale.mail_template_menu` / `sale_order_template_action` | `/order/quotation-templates` | Read, create, duplicate-reject, validate, edit, stale-write reject, line-create, and missing-template guards | `bun test test/sales_quotation_templates.integration.test.ts` — 2 tests, 21 assertions | pass | 2026-09-12 |
| ORDER-CONTRACT-001 | Sales reporting customer/salesperson actions | `/order/reporting/customers`, `/order/reporting/salespersons` | Validate page/API binding and graph/pivot/search/date contracts | Sales-focused suite passes; `bun run audit` passes with 648 pages, 663 routes, and 1113 datasources | pass | 2026-09-12 |
| ORDER-BROWSER-001 | Sales menus and order form | `/order/quotations`, `/order/sales-orders`, `/order/orders-to-upsell` | Authenticated desktop/mobile navigation, CRUD/workflow interaction, reload persistence, and overflow check | No capture; required persistent `js_repl` browser surface unavailable | blocked | 2026-09-12 |

## Bugs and retests

| Bug ID | Failure | Evidence | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- | --- |
| ORDER-QA-001 | Customer and salesperson report tests failed when `discoverPages()` validated the full sample; invalid datasource error was recorded as outside Order ownership | `bun run audit` now passes; Sales-focused suite also passes 18/18 | — | Retested in `sdk/bun/sample`; no current discovery defect | fixed |
| ORDER-QA-002 | Authenticated visual/browser verification could not start because persistent `js_repl` is unavailable in this session | Skill precondition failure; no browser artifact claimed | — | Re-run from browser-capable QA session | open |
| ORDER-QA-003 | Bulk Orders to Invoice does not invoke the Accounting source-invoice service or set `accounting_invoice_id` | `sale-to-invoice.yaml` now iterates selected orders through `yaml.service.accounting` / `accounting.invoices.create_from_source`, then persists the returned ID in `sale_invoices.accounting_invoice_id` | `54f4db20` | `bun test test/sales_orders_to_invoice.integration.test.ts`: 4 tests, 24 assertions; Accounting linkage, failure rollback, permission declaration, duplicate, branch-scope, and stale-selection guards pass | fixed |
| ORDER-QA-004 | Candidate-level authenticated UI, restricted-actor, restart, and paired Odoo evidence is unavailable in this bounded run | No Playwright/Odoo probe was started; predecessor desktop evidence is explicitly not reused as candidate retest evidence | — | Re-run with authenticated Core3 and Odoo sessions, desktop/mobile captures, restricted actor, and restart persistence check | open |

## Sign-off

- Functional: bounded contract/static verification passes; Sales regression probe was interrupted after 12 passes
- Permissions: contract coverage present; authenticated restricted-user browser check pending
- Persistence/data integrity: Accounting linkage and rollback pass in isolated tests; candidate browser reload/restart persistence pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off; repository-wide discovery and browser evidence remain open

## 2026-09-20 quotation email composer slice

- Source contract: Odoo `sale.action_quotation_send` /
  `sale.order.action_quotation_send` opens a composer for draft/sent orders;
  the form carries the recipient, subject, message, and quotation attachment.
- Core3 implementation: the dedicated Sales order API fragment now exposes a
  `mail_composer` `send_sale_quotation` form, durable
  `sale_order_quotation_mails` history, deterministic customer email and
  attachment fixtures, actor timeline logging, and guarded draft-to-sent
  transition. Page/API ownership remains separate at `sale-order-detail`.
- Exact focused evidence: `bun test
  test/sales_quotation_email.integration.test.ts --timeout 30000` — **3
  passed, 19 assertions, 0 failures**. This covers migration replay, send,
  stale/invalid/scope/missing boundaries, and reopening a file-backed DuckDB.
- Browser/Odoo visual delivery evidence was not claimed for this bounded
  contract slice; authenticated desktop/mobile composer interaction remains a
  planned gate. No screenshots were added to Git.

## 2026-09-13 coordinator review: candidate `ecc15927`

- Integrated only the bounded Order restart-persistence/idempotent-migration
  test as `cf94c702` on the active branch. The ownership boundary is clean:
  one Order-owned test file and no product, shared-runtime, or unrelated
  changes.
- Post-merge focused test passed: **1 test, 7 assertions**. Candidate Sales
  regression evidence remains **19 tests, 180 assertions**; restart persistence
  and double migration replay retained stable order, line, template, and line
  counts. Candidate audit (**659 pages, 669 routes, 1134 datasources**), Order
  CSS, scoped ESLint, and diff-check passed.
- Order remains **conditional / unsigned-off**. Pre-existing TypeScript
  diagnostics, unavailable Core3/browser/Playwright evidence, authenticated
  desktop/mobile persistence checks, and paired Odoo comparison remain open.

## Reviewer reconciliation `59af3991`: conditional bounded PASS (2026-09-13)

- Ownership was valid in `agent/order-wave-dev1` at
  `/home/nhanjs/projects/core3-worktrees/order-wave-dev1`; the candidate was a
  self-contained three-file quotation-template-to-order slice. It cherry-picked
  cleanly as `7992f95e` with no unrelated files.
- Post-merge focused conversion verification passed **3 tests / 15 assertions**;
  audit passed **661 pages / 670 routes / 1,157 datasources**; frontend build
  and diff-check passed. QA additionally reports targeted ESLint, full Sales
  **25 tests / 213 assertions**, and file-backed replay passing.
- Accepted QA evidence covers deterministic Draft creation (total **1,750**
  plus activity), duplicate/stale/invalid guards, atomic rollback/no partial
  order, branch/permission scope, authenticated desktop/mobile rendering,
  reload persistence, and file-backed migration replay.
- Disposition: **conditional bounded PASS; integrated**. Live app-server
  restart remains limited by the duckdb-memory runner, and fresh paired
  authenticated Odoo comparison remains unavailable. Order remains unsigned
  off for broader parity gates.
## 2026-09-13 coordinator dispatch — bounded template workflow wave

- Existing owner `agent/order-wave-dev1` is assigned on
  `/home/nhanjs/projects/core3-worktrees/order-wave-dev1`, based at `ecc15927`.
  Development event: `DEV-ORDER-WAVE-20260913-R2`; QA event:
  `QA-ORDER-WAVE-20260913-R2`; handoff commit: `3b568dbf`.
- Scope is Order-owned quotation-template-to-order creation with atomic line
  persistence, validation, duplicate/missing/stale guards, permission/company
  scope, and focused tests. Candidate pending; aggregate progress untouched.
  Existing owner-ledger edits are preserved.

## 2026-09-13 R2 coordinator dispatch

## QA-pending quotation-template candidate `59af3991` (2026-09-13)

- Existing owner/worktree: `agent/order-wave-dev1` at
  `/home/nhanjs/projects/core3-worktrees/order-wave-dev1`; candidate is not
  merged and awaits existing Order QA.
- Coordinator evidence: focused suite **3 tests / 15 assertions** and audit
  **659 pages / 669 routes / 1,137 datasources** pass; diff-check passes.
  Candidate build and targeted lint confirmation remain with QA.
- Browser, restricted actor, restart, and paired Odoo gates remain open.

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-ORDER-CROSS-MODULE-WAVE-20260913-R2` → `QA-ORDER-CROSS-MODULE-WAVE-20260913-R2` | existing `agent/order-qa-003-cross-module-20260913` in `/home/nhanjs/projects/core3-worktrees/order-qa-003-cross-module-20260913` | CRM/Base customer reference resolution, company/permission/stale/missing guards, downstream rollback, and focused atomicity tests | dispatched in `b50cd200`; awaiting self-contained product commit before QA |

## Next review handoff: Orders to Invoice `61422c4e`

- QA is complete for the bounded Accounting-linked bulk-invoice repair:
  focused 4/4, audit 659/668/1139, targeted ESLint, and diff-check passed;
  service linkage, persisted `accounting_invoice_id`, duplicate/branch/stale/
  permission guards, and Accounting-failure rollback are covered.
- Route the next event to the central review/integration gate using QA branch
  `agent/order-qa-003-cross-module-20260913` at
  `/home/nhanjs/projects/core3-worktrees/order-qa-003-cross-module-20260913`,
  candidate `61422c4e`. Do not use the developer owner’s later dispatch-only
  HEAD `59af3991` as a substitute.
- Review must verify the shared mutation-runtime extension remains scoped and
  self-contained before any merge. Candidate-level authenticated mobile,
  restricted-actor, restart, and paired Odoo evidence remain open; this is a
  conditional review handoff, not full Order sign-off.

## Review reconciliation: `61422c4e`

- The candidate is self-contained within Order plus the declared generic
  mutation-runtime service-step extension. Its Order YAML and focused test
  tree are already present on active as equivalent commit `cd553ac4`; the
  active runtime is newer and contains the candidate's `for_each`, service
  call, request resolution, and assignment behavior plus additional existing
  guards. No older runtime downgrade was applied.
- Active focused verification: `bun test
  ./test/sales_orders_to_invoice.integration.test.ts --timeout 120000` — **4
  pass, 24 assertions**. Candidate QA's audit, targeted ESLint, and diff-check
  evidence remain valid for the unchanged product tree.
- Disposition: conditionally reconciled without a duplicate cherry-pick.
  Active product equivalent: `cd553ac4`; candidate `61422c4e` was not merged
  separately. Mobile/restricted-actor, restart, and paired Odoo evidence remain
  open.

## 2026-09-22 Sales order display lines slice

- Source contract: Odoo `sale/views/sale_order_views.xml` defines `Add a
  section` and `Add a note` controls with `default_display_type` values
  `line_section` and `line_note`; `sale/models/sale_order_line.py` forces those
  rows to zero quantity and rejects accountable product/price values.
- Core3 implementation is limited to Order paths: migration
  `20260922100000-022-sales-order-display-lines.yaml`, the existing paired
  `sale-order-detail` API/page fragments, and
  `test/sales_order_display_lines.integration.test.ts`.
- Focused suite: **4 passed, 24 assertions, 0 failures**. It covers page/API
  binding, create/edit/delete, zero-total preservation, audit entries,
  invalid/stale/locked/out-of-scope writes, idempotent migration replay, and
  file-backed restart persistence. `git diff --check` passed.
- Authenticated Odoo desktop/mobile evidence is under
  `/tmp/core3-odoo-parity/sales-next-20260922/`. Core3 visual evidence is
  blocked: `ss -ltnp` showed only `0.0.0.0:8069` and `[::]:8069`; `127.0.0.1:3001`
  and `127.0.0.1:3002` were not listening. No Core3 visual parity claim is made.
- Browser instance `245ea108` was used. The owned `bsk` session was stopped by
  request after capture; the extension did not acknowledge stop within the CLI
  timeout and the daemon reported the stop already in progress. No credentials,
  cookies, or tokens were extracted.

## 2026-09-22 Sales order discount wizard slice

- Source contract: Odoo `sale/wizard/sale_order_discount.py` exposes percentage
  discounts on all order lines plus global and fixed discount-line modes;
  `sale/wizard/sale_order_discount_views.xml` defines the Discount/Apply/Discard
  modal, and `sale/views/sale_order_views.xml` exposes the Discount action.
- Core3 implementation is limited to Order paths: the paired
  `sale-order-detail` page/API fragments, migration
  `20260922130000-023-sales-order-discount.yaml`, and
  `test/sales_order_discount.integration.test.ts`.
- Focused discount suite: **3 passed, 18 assertions, 0 failures**. It covers
  wizard declarations, percentage/global/fixed persistence and recomputation,
  audit/replay, invalid/stale/scope/duplicate guards, and atomic writes.
- Regression suite after updating the existing line-action assertion: **17
  passed, 0 failures, 128 assertions** across the Order detail, display-lines,
  quotation-template, quotation-email, and discount slices.
- Authenticated Odoo reference desktop/mobile captures are under
  `/tmp/core3-odoo-parity/sales-discount-20260922/`. Core3 visual capture is
  blocked because the required local UI listeners on `127.0.0.1:3001` and
  `127.0.0.1:3002` were unavailable; no visual-parity claim is made.
