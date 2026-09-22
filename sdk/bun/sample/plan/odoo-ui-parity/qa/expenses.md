# expenses QA ledger

## Conditional review handoff — exact candidate `887fa7fb` (2026-09-13)

- Bounded import/export/print contract: **conditional pass**. Expenses tests
  passed when reached; import persistence, deterministic IDs, sheet-total
  recalculation, replay safety, malformed-row and company-scope guards, plus
  permissioned export/print actions are covered.
- Candidate-local audit, Expenses Sass, frontend build, applicable ESLint, and
  `git diff --check` passed. No Expenses-specific TypeScript diagnostic was
  reported.
- Blocker `EXPENSES-HTTP-001`: the full repository run did not finish cleanly
  because Core3 startup encountered a port collision; candidate browser QA was
  unavailable and no candidate interaction/screenshot claim is made.
- Blockers retained: pre-existing Website ESLint errors, shared TypeScript
  diagnostics, authenticated browser/actor coverage, and paired Odoo desktop/
  mobile comparison remain open.

Disposition: bounded Expenses change integrated conditionally; preserve all
blockers and do not claim full module sign-off or aggregate progress.

## Candidate QA evidence (2026-09-13)

- Candidate under test: `1d9df642` (`feat(expenses): add import export and print actions`). This candidate adds the Expenses list import/export/print contracts, deterministic import persistence test, and module plan/QA updates.
- Focused command: `bun test ./test/*expense*.integration.test.ts --timeout 20000` from `sdk/bun/sample` — 33 passed, 198 assertions, 0 failed across 10 files.
- Migration upgrade/replay: `expenses_migrations.integration.test.ts` upgraded an in-memory database from `0.0.2` to latest, replayed the latest schema/data migration, and preserved 2 sheets, 9 expenses, 8 activities, 0 runtime attachments, 1 duplicate candidate, 2 split lines, 10 migration versions, and the `sha256:receipt-air-duplicate` checksum without duplicate seeded rows.
- Receipt/activity/split behavior: focused tests pass receipt-required approval, refusal reason plus activity persistence, duplicate approve/refuse activity and stale replay guards, and split-line CRUD, exact-total validation, matching application, relation, and activity persistence.
- Permissions/regressions: focused permission tests pass the manager action metadata/boundaries and Fleet ordinary-user 403; stale/missing/invalid mutations preserve rows. The full UI audit passes (659 pages, 668 routes, 1136 datasources). `git diff --check` passes.
- Import/export/print: `expenses_import_export.integration.test.ts` passes 3
  tests and 16 assertions. Import persistence, deterministic IDs, sheet-total
  recalculation, replay safety, malformed-row rejection, and company-scope
  denial are covered; export/print permissions and datasource binding are
  asserted. Relevant ESLint and `bun run css:build:expenses` pass.
- Static gates: `bun run lint` fails on two unrelated existing errors in `sdk/bun/sample/test/website_public.integration.test.ts:31` and `:33` (`no-unsafe-optional-chaining`); no warnings or Expenses diagnostics were reported. `bunx tsc --noEmit --pretty false` also fails on existing shared `packages/*`, `services/ai`, and server/client diagnostics; no Expenses-specific diagnostic appeared.

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/expenses-desktop.png and expenses-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable expenses assignment (pending wave dispatch)
Module owner: expenses module owner
Verification trigger: feature-complete

## Batch 7 - incoming email gateway (2026-09-21)

- Candidate scope: EXPENSE-FUNC-010, Odoo hr_expense Incoming Emails alias
  configuration and message_new-style draft creation.
- Focused evidence: expenses_email_gateway.integration.test.ts - 3 tests /
  19 assertions passed. It covers page/API separation, alias persistence,
  sender identity resolution, category/amount parsing, receipt/activity and
  sheet-total persistence, idempotent replay, conflicting replay, disabled
  gateway, alias mismatch, company scope, and invalid alias validation.
- bun run css:build:expenses and git diff --check passed.
- bun run audit now passes after the existing workspace discovery changes were
  present. No CRM or other module files are part of this candidate.
- The full Expenses corpus now passes 42 tests / 248 assertions across 12
  files. The migration replay expectation was updated from 11 to 12 versions
  to include the idempotent email-gateway migration.
- Authenticated Odoo shared-browser refresh succeeded for /odoo -> Expenses ->
  My Expenses on browser instance 245ea108. Core3 desktop/mobile refresh was
  attempted at 4029/4030. The backend eventually bound after delayed startup,
  but the shared browser profile had no Core3 authentication and
  `/api/pages/dashboard` returned 401; no Core3 visual parity claim is made.
Candidate commit: `1d9df642`

Detailed execution matrix: [`test-plans/expenses.md`](test-plans/expenses.md). It is the module-level source for expense CRUD, workflows, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| EXPENSES-001 | Focused Expenses contract corpus | 33 focused tests / 198 assertions across 10 files | PASS |
| EXPENSES-002 | Registered route responsive matrix | 10 routes × desktop/mobile = 20/20; no page/request errors, HTTP failures, or overflow | PASS |
| EXPENSES-003 | Expense lifecycle persistence | `expense-demo-draft` Draft → Submitted → Approved → Posted, versions 1 → 4; journal/date persisted | PASS |
| EXPENSES-004 | Manager permission boundary | Fleet approval returned 403 `expenses.manage` | PASS |
| EXPENSES-005 | Fresh paired Odoo visual and full interaction coverage | Not yet completed for the current candidate | pending |
| EXPENSES-006 | Migration upgrade/replay persistence | 0.0.2 → latest upgrade plus replay preserved 2 sheets, 9 expenses, 8 activities, 0 runtime attachments, 1 duplicate candidate, and 2 split lines | PASS |
| EXPENSES-007 | Candidate browser retest | Fresh authenticated interaction/actor retest remains unavailable; existing route-smoke PNGs are retained as prior evidence only | BLOCKED |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| EXPENSES-BROWSER-001 | No current-wave QA evidence | — | Replaced by EXPENSES-001 through 004 | closed |

## Sign-off

- Functional: pass for tested expense lifecycle and contracts
- Permissions: pass for tested manager boundary
- Persistence/data integrity: pass for tested lifecycle
- Migration/restart persistence: pass for upgrade and replay fixture invariants
- Desktop/mobile visual parity: route rendering pass; paired Odoo parity pending
- Tester decision: conditional; fresh browser interaction, authenticated actor matrix, paired Odoo comparison, and clean repository lint remain open
## 2026-09-13 coordinator dispatch — bounded receipt wave

## QA-pending receipt-processing candidate `99fe4073` (2026-09-13)

- Existing owner/worktree: `agent/odoo-expenses-dev-next-20260913` at
  `/home/nhanjs/projects/core3-worktrees/odoo-expenses-dev-next-20260913`;
  candidate is not merged and awaits existing Expenses QA.
- Coordinator evidence: receipt-processing plus migration tests **6 tests / 23
  assertions** and audit **659 pages / 668 routes / 1,137 datasources** pass.
  Candidate build and targeted lint/diff-check confirmation remain with QA.
- Authenticated actor/browser, restart, Temporal/provider, paired Odoo, and
  repository lint gates remain open.

- Existing owner `agent/odoo-expenses-dev-next-20260913` is assigned on
  `/home/nhanjs/projects/core3-worktrees/odoo-expenses-dev-next-20260913`,
  based at `887fa7fb`. Development event:
  `DEV-EXPENSES-WAVE-20260913-R2`; QA event:
  `QA-EXPENSES-WAVE-20260913-R2`; handoff commit: `be5afa3b`.
- Scope is a bounded receipt-processing attempt/result contract with persisted
  failure and retry/replay idempotency, ownership/permission guards, and
  focused no-duplicate/no-partial-write tests. Candidate pending; aggregate
  progress and unrelated edits are preserved.

## Reviewer reconciliation `99fe4073`: conditional bounded PASS (2026-09-13)

- Ownership was valid in `agent/odoo-expenses-dev-next-20260913` at
  `/home/nhanjs/projects/core3-worktrees/odoo-expenses-dev-next-20260913`.
  The five-file candidate is self-contained for synchronous receipt processing
  state, migration, detail binding, and focused tests; it integrated cleanly as
  `f497301b`.
- Post-merge verification passed **38 tests / 217 assertions** across 11
  Expenses files, including **5 receipt-processing tests / 19 assertions**;
  audit passed **661 pages / 670 routes / 1,158 datasources**; frontend build
  and diff-check passed. QA reports targeted ESLint also passed.
- Accepted evidence covers success/failure/retry/replay, deterministic
  timestamps and attempts, attachment/activity persistence, idempotency,
  company scope, permissions, CRUD/workflows, authenticated desktop/mobile
  no-error/no-overflow behavior, and migration/replay invariants.
- Temporal is **not applicable** to this declared synchronous provider
  boundary; no external provider or Temporal workflow is configured.
- Disposition: **conditional bounded PASS; integrated**. Fresh authenticated
  paired Odoo comparison and file-backed live process restart remain open.
  Expenses is not fully signed off.

## Batch 8 - expense activity scheduling/completion (2026-09-22)

- Candidate scope: EXPENSE-FUNC-011, source-backed `hr.expense` activity
  scheduling and completion from `mail.activity.mixin` / `activity_ids`.
- Core3 adds the durable `expense_scheduled_activities` migration and joins its
  planned/done records with the existing detail chatter datasource. The page
  remains presentation-only and uses `page.id: expense-detail`; shared
  `OdooChatter` renders Schedule activity and Mark done.
- Focused evidence: `expenses_activities.integration.test.ts` — 4 tests / 23
  assertions passed. It covers source mapping, deterministic seeded activity,
  scheduling/completion, invalid type/summary/date, actor/company and stale
  guards, completion audit, file-backed restart, and migration replay.
- Audit passed with 782 pages, 791 routes, and 1,606 datasources; Expenses CSS
  build and `git diff --check` passed. The first full Expenses run found and was
  repaired for the expected migration count increase from 12 to 13.
- Authenticated Odoo reference captures and any Core3 browser blocker are
  recorded in the feature evidence folder. No full module sign-off is claimed.

## Batch 9 - expense category cost propagation (2026-09-22)

- Candidate scope: EXPENSE-FUNC-012, Odoo `product.product.standard_price`
  behavior used by `hr.expense` categories.
- Focused evidence: `expenses_category_cost.integration.test.ts` — 4 tests /
  18 assertions passed. It covers page/API separation, warning metadata,
  quantity-preserving draft cost updates, category rename relinking, sheet
  totals, zero-cost behavior, negative-cost rejection, stale replay, and
  migration replay. The combined category/migration run was 8 tests / 61
  assertions.
- `20260922110000-014-expense-category-cost-index.yaml` is idempotent and the
  migration persistence gate now verifies 14 applied versions with unchanged
  seeded row counts after replay.
- Authenticated Odoo desktop/mobile captures are present under the feature
  evidence folder. Desktop is 1916x833 because the shared Agent Window did not
  retain the requested resize; mobile is 390x844. Core3 authenticated browser
  interaction remains blocked by the absent local Core3 listener and is not
  claimed.

| EXPENSE-FUNC-012 | Expense category cost write | Draft linked expenses update with quantity, category rename relinks, non-draft amounts remain stable, sheet totals persist, and invalid/stale writes are rejected | pass: focused suite |

## Batch 10 - My Expenses Activity view (2026-09-22)

- Candidate scope: `EXPENSE-FUNC-013`, Odoo My Expenses Activity view only.
- Source-backed change: the shared ActivityView is now declared on the Expenses
  page with Odoo's six activity columns; the service datasource joins the
  durable scheduled-activity row without page-local fixtures or new schema.
- Focused evidence: `expenses_activity_view.integration.test.ts` covers the
  page/API binding, source-defined labels, scheduled-row metadata, search,
  empty state, and transport error.
- Odoo captures are present under the feature evidence folder at the available
  Agent Window desktop size `1916x833` and requested mobile size `390x844`.
- Core3 authenticated browser verification remains conditional on the local
  Core3 listener and authenticated session; no Core3 visual parity claim is
  made if that runtime is unavailable.

## Batch 11 - expense accounting document action (2026-09-22)

- Candidate scope: `EXPENSE-FUNC-015`, Odoo `action_open_account_move` and the
  Expense form Journal Entry/Payment smart button.
- Source-backed behavior: Odoo chooses the linked `account.move` for
  employee-paid expenses and the originating `account.payment` for
  company-paid expenses. Core3 now persists typed target links, applies the
  current-company read boundary, and opens the existing Accounting detail
  route with `accounting.read`.
- Focused evidence: `expenses_accounting_link.integration.test.ts` — 3 tests /
  15 assertions passed when combined with the migration persistence gate. It
  covers page/API separation, typed destinations, wrong-company/empty/error
  behavior, stable seeded IDs, and replay-safe migration data.
- `bun run audit`, Expenses CSS, frontend build, and `git diff --check` pass.
- Browser blocker: on BrowserSkill instance `245ea108`, the signed-in Odoo tab
  `1770662590` was already borrowed by session `wbjh`; no live Odoo DOM or
  desktop/mobile capture was read, and no visual-parity claim is made.

| EXPENSE-FUNC-015 | Expense accounting document action | Posted/in-payment detail exposes the correct typed Journal Entry or Payment destination with company and permission guards | pass: focused suite; visual browser gate blocked |
| EXPENSE-FUNC-016 | Split Expense wizard parity | Odoo tax fields/labels, exact totals, product-cost guard, tax propagation, child relations, and receipt attachment copy | pass: 6 tests / 21 assertions; visual browser gate blocked |
| EXPENSE-FUNC-017 | Department approval Form mode | Odoo `list,kanban,form,pivot,graph` order and shared detail binding for the department approval action, preserving scope and guards | pass: focused suite; visual browser gate blocked |

## Batch 12 - Split Expense wizard parity repair (2026-09-22)

- Candidate scope: `EXPENSE-FUNC-016`, the non-analytics/non-accounting Odoo
  Split Expense action and its existing detail line editor.
- Source-backed change: `expense-detail` remains presentation-only while the
  service API adds Odoo tax totals/line metadata, product-cost enforcement,
  first-line tax persistence, and stable receipt attachment copies for child
  expenses.
- Focused evidence: `expenses_split.integration.test.ts` — 6 tests / 21
  assertions passed. The full Expenses corpus passed 60 tests / 325
  assertions across 17 files. Audit, Expenses CSS, frontend build, targeted
  ESLint, and `git diff --check` passed.
- BrowserSkill instance `245ea108` was connected, but required tab
  `1770662590` was borrowed by session `cqvt`; this worker stopped session
  `czha` and made no current Odoo desktop/mobile visual claim.

## Batch 13 - department approval Form mode (2026-09-22)

- Candidate scope: `EXPENSE-FUNC-017`, the missing Form mode on Odoo's
  `action_hr_expense_department_to_approve`.
- Core3 now declares the source order `list,kanban,form,pivot,graph`, binds the
  Form mode to the existing `expense-detail` page, and makes row open and
  double-click use the existing permissioned detail action. No new schema or
  module renderer was added.
- Focused evidence is under
  `odoo-ui-parity/evidence/expenses/2026-09-22/EXPENSE-FUNC-017/`.
- First focused run passed 3 tests / 14 assertions. The later full corpus ran
  60 tests with 51 passing; global discovery failures are caused by unrelated
  concurrent Purchase/Fleet/Recruitment/Time Off edits, including the Purchase
  `upload_purchase_bill` action reference. Expenses page/API validation, CSS,
  frontend build, and diff-check passed; the audit remains blocked by that
  unrelated discovery defect.
- BrowserSkill instance `245ea108` was connected, but tab `1770662590` was
  already borrowed by session `yabv`; the borrow was denied. This worker
  stopped session `wryg`, captured no Odoo DOM or screenshots, and makes no
  desktop/mobile visual-parity claim.
