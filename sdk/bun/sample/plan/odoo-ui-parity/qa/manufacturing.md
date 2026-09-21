# manufacturing QA ledger

## MANUFACTURING-WCWO-001 — Work Center Work Orders scoped action (2026-09-21)

- Source/action: local Odoo 19 `mrp.action_work_orders`,
  `addons/mrp/views/mrp_workcenter_views.xml`; record-scoped Work Center
  dashboard action for `mrp.workorder`, non-terminal domain, and
  `list,form,pivot,graph,calendar` modes.
- Core3 paths: presentation
  `services/manufacturing/pages/work-center-workorders.yaml`; page-id-bound
  API/actions `services/manufacturing/api/work-center-workorders.yaml`;
  overview binding `services/manufacturing/api/work-center-overview.yaml`;
  durable index migration
  `services/manufacturing/migrations/20260921100000-021-work-center-workorders-index.yaml`;
  focused test `test/manufacturing_work_center_workorders.integration.test.ts`.
- Functional/data result: PASS, 4 tests / 24 assertions. Isolated discovery
  finds the page/API pair and route. Replaying the Manufacturing migration
  chain twice remains idempotent; Assembly 1 returns only its persisted
  non-terminal row, Assembly 2 returns its waiting row, terminal rows are
  excluded, search/empty/503 states are covered, and the scoped row survives
  a file-backed close/reopen restart.
- Workflow/permission result: PASS at contract level. The six scoped actions
  require `manufacturing.write`, reuse the durable `mrp_workorders` workflow,
  and expose no create/delete action. Read and 401/403/503 declarations are
  explicit.
- Odoo browser verification: BLOCKED, exact reason. Using bsk session `nmok`
  on browser instance `245ea108`, the authenticated navigation request to
  `http://localhost:8069/odoo/work-centers` redirected to Discuss/OdooBot at
  both desktop and emulated iPhone 14 (`390x844`); the launcher had no
  Manufacturing menu. No credentials, cookies, or tokens were extracted.
  No Odoo Manufacturing visual sign-off is claimed.
- Evidence: feature folder
  `plan/odoo-ui-parity/evidence/manufacturing/2026-09-21/MANUFACTURING-WCWO-001/`;
  blocker screenshots are `odoo-desktop-blocker.png` and
  `odoo-mobile-blocker.png`. Core3 browser visual evidence is not claimed from
  this bsk session because the available authenticated profile was the Odoo
  reference profile and no Core3 login was supplied through the browser skill.
- Regression: the initial global `bun run audit` was blocked by the unrelated
  malformed `services/surveys/api/survey-detail.yaml`; after the concurrent
  Surveys change landed, the final audit rerun passed at 778 pages, 787 routes,
  and 1,600 datasources. No Surveys file was modified by this owner.
  Manufacturing-only focused tests, CSS build, targeted ESLint, and diff-check
  pass.

## MANUFACTURING-WORA-001 retest — candidate `63b8d712` (2026-09-13)

- Worktree correction: the requested `/home/nhanjs/projects/core3-worktrees/agent/` path does not exist. The registered worktree used was `/home/nhanjs/projects/core3-worktrees/odoo-ui-manufacturing-work-orders-analysis-transport-ui`, at the exact requested candidate `63b8d7127963e5a8b93a3df811e12b56315cde4b`; checkout was clean before testing.
- Authenticated browser: `admin@tms.local` / `admin123`, isolated runtime backend `http://localhost:4313`, Vite frontend `http://localhost:4315`. Exact URL `/manufacturing/work-orders-analysis?fixture_state=transport_error` rendered the `role=alert` state at desktop `1440x900` and mobile `390x844`: `Data unavailable`, `Work Orders Analysis is temporarily unavailable.`, and `503 MRP_WORKORDER_ANALYSIS_UNAVAILABLE`. Both had `pageerror=0`, `requestfailed=0`, and `documentWidth=bodyWidth=innerWidth` (`1440` / `390`).
- Fresh captures, intentionally outside Git, were visually inspected: `/tmp/core3-manufacturing-work-orders-analysis-transport-ui-desktop-1440x900-20260913.png` (SHA-256 `5854441e1fba3a5dbdf967c7eed8e3fb4e398175c8c1c97571983aa01bba8e70`) and `/tmp/core3-manufacturing-work-orders-analysis-transport-ui-mobile-390x844-20260913.png` (SHA-256 `0b4a4ac0807d277bfe1353ad6ef4f6b49fe521785fb65aed0d4be365f784845d`).
- Renderer regression: `bunx vitest run --config vitest.config.ts test/cases/page-renderer-list-view.test.ts` from `sdk/bun/packages/client` — 12 tests passed. Focused Manufacturing: `bun test ./test/manufacturing_work_orders_analysis.integration.test.ts --timeout 20000` — 5 tests / 50 assertions passed. Full Manufacturing: `bun test ./test/manufacturing*.integration.test.ts --timeout 20000` — 60 tests / 680 assertions passed across 19 files.
- Repository checks: targeted ESLint for the three changed client files passed with zero warnings; `bun run audit` passed (`659` pages, `668` routes, `1,138` datasources); `bun run css:build:global` and `bun run css:build:manufacturing` passed; `git diff --check` passed. Full sample ESLint remains non-clean because of two pre-existing `no-unsafe-optional-chaining` errors in `test/website_public.integration.test.ts:31` and `:33`; no warnings or product-code changes were introduced by this retest.
- Paired Odoo evidence available from the prior bounded reference pass remains recorded in `plan/odoo-ui-parity/manufacturing.md`: authenticated desktop/mobile Work Orders Analysis graph, pivot, list, and form captures under `/tmp/odoo-manufacturing-work-orders-analysis-20260911/`, with hashes and dimensions. No fresh Odoo probe was run in this retest.

Retest decision: the exact transport-error UI repair is **browser-verified** on authenticated desktop/mobile, and the renderer/focused/full-suite and repository checks above pass. This ledger does not sign off complete Manufacturing parity, CRUD, permissions, workflows, or aggregate progress; those remain governed by the existing open gates.

## MANUFACTURING-WORA-001 repair — pending browser retest (2026-09-13)

- Repair target: the active Work Orders Analysis transport-error route now
  propagates datasource errors into the shared Odoo ListView, which renders
  `Data unavailable`, HTTP `503`, code `MRP_WORKORDER_ANALYSIS_UNAVAILABLE`,
  and the declared unavailable message instead of `No Work Orders Analysis
  data`.
- Regression evidence: configured jsdom renderer test passes; Manufacturing
  focused test passes 5 tests / 50 assertions. Full Manufacturing suite passes
  60 tests / 680 assertions across 19 files.
- Audit passed with 659 pages, 668 routes, and 1,138 datasources. Manufacturing
  CSS build, targeted ESLint, and `git diff --check` passed.
- Fresh authenticated browser retest is still pending; no new screenshot or
  browser sign-off is claimed here. Aggregate progress was not edited.

## MANUFACTURING-WORA-001 retest — commit `499edd41` (2026-09-13)

- Retest target: `499edd41` (`fix(manufacturing): render work order analysis
  transport errors`). The user-supplied path included an extra `/agent/`
  segment and did not exist; the registered linked worktree used was
  `/home/nhanjs/projects/core3-worktrees/odoo-ui-manufacturing-work-orders-analysis-transport`,
  on branch `agent/odoo-ui-manufacturing-work-orders-analysis-transport`.
- Authenticated browser probe used `admin@tms.local` on a fresh temporary Core3
  runtime at `http://127.0.0.1:4313`. The exact URL
  `/manufacturing/work-orders-analysis?fixture_state=transport_error` rendered
  the declared empty state (`No Work Orders Analysis data`) at both 1440x900
  and 390x844. It did not render the declared 503 text or code. Both passes
  had `pageerror=0`, `requestfailed=0`, and no horizontal overflow
  (`documentWidth=1440`, `bodyWidth=1424`; `documentWidth=390`,
  `bodyWidth=374`). The temporary runtime was stopped after the probe.
- Captures (outside Git):
  `/tmp/core3-manufacturing-work-orders-analysis-transport-desktop-1440x900-20260913.png`
  SHA-256 `8d057f6149c767177b974bde6c57f8117430bae115193b4a8eb2190ddf9ed5e3`;
  `/tmp/core3-manufacturing-work-orders-analysis-transport-mobile-390x844-20260913.png`
  SHA-256 `83cc0bc718438bcdadc0c9fee292c530d85ecad6068875c19c63edd9b30c9387`.
- Focused repair suite: `bun test ./test/manufacturing_work_orders_analysis.integration.test.ts --timeout 20000` — 5 tests, 50 assertions passed, including the public 503 envelope schema acceptance, company isolation, unauthorized/forbidden/transport contracts, and detail guard.
- Full Manufacturing glob (`19` integration files) did not complete: it was
  still running at approximately 50 seconds with the test process at 99% CPU,
  so the exact process was terminated and recorded as timeout/no aggregate
  result. No conclusion is drawn from the partial output.
- Guarded repository checks: audit passed (`659` pages, `668` routes, `1138`
  datasources); `bun run css:build:global` and
  `bun run css:build:manufacturing` passed; `git diff --check` passed. ESLint
  failed on two unrelated existing `no-unsafe-optional-chaining` errors in
  `test/website_public.integration.test.ts:31` and `:33`; no warnings or
  product-code changes were introduced by this retest.
- Paired Odoo evidence available from the prior bounded source inspection is
  recorded in the module plan: desktop/mobile graph, pivot, list, and form
  captures under `/tmp/odoo-manufacturing-work-orders-analysis-20260911/`
  with hashes recorded there. No fresh Odoo probe was run in this retest.

Retest decision: `MANUFACTURING-WORA-001` remains **not browser-verified**;
the focused contract passes, but the exact authenticated transport URL did not
show the declared 503 state. No Manufacturing sign-off or aggregate progress
claim is made.

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/manufacturing-desktop.png and manufacturing-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable manufacturing assignment (pending wave dispatch)
Module owner: manufacturing module owner
Verification trigger: feature-complete
Candidate commit: working tree after authenticated manufacturing QA

## MRP-FUNC-008 migration replay repair — pending owner verification

- Root cause: migration `0.0.6` previously deleted every row from
  `mrp_productions`, `mrp_workorders`, and `mrp_production_moves` before
  inserting its deterministic fixtures. A replay through a new migration
  ledger could therefore erase existing Manufacturing data.
- Owner repair narrows cleanup to the six MO, six work-order, and four move
  fixture IDs owned by that migration. New focused coverage is in
  `test/manufacturing_migrations.integration.test.ts`: it applies the full
  chain under two ledgers, inserts existing rows between runs, and asserts
  those rows and fixture counts survive without duplication.
- Browser, audit, CSS, lint, and diff-check verification is pending for this
  owner change; no module sign-off or aggregate progress update is implied.

## MRP-FUNC-008 migration replay — owner verification (2026-09-13)

- Focused replay test passes: `1 test / 7 assertions`. Full Manufacturing
  corpus passes `61 tests / 687 assertions` across 20 files.
- The test applies the full Manufacturing migration chain under two ledgers,
  inserts existing MO/work-order/move rows between applications, and proves
  those rows survive while deterministic fixtures remain singletons.
- Audit passes (`659` pages, `668` routes, `1,138` datasources); global and
  Manufacturing CSS builds pass; targeted ESLint and `git diff --check` pass.
  Repository-wide `bun run lint` remains blocked only by the two pre-existing
  website optional-chaining errors at `test/website_public.integration.test.ts`
  lines 31 and 33.
- This closes the migration replay sub-gate for the candidate. Paired Odoo,
  authenticated CRUD/actor, restart, and other open Manufacturing gates remain
  conditional; no module sign-off or aggregate progress update is implied.

## MRP-FUNC-008 migration replay — QA review of exact candidate `47544151` (2026-09-13)

- Focused replay: **PASS**, 1 test / 7 assertions. Existing MO, work-order,
  and move rows survived a second migration ledger and fixture rows remained
  singletons.
- Full Manufacturing corpus: **PASS**, 61 tests / 687 assertions across 20
  files. Audit passed at 659 pages / 668 routes / 1,138 datasources; global and
  Manufacturing CSS, targeted ESLint, and `git diff --check` passed.
- Authenticated Core3 transport-error browser evidence passed at 1440x900 and
  390x844 with zero page/request errors and no overflow; exact Odoo login was
  available but no authenticated paired Odoo capture was obtained.

QA disposition: **PASS for review handoff of bounded candidate `47544151`**;
paired Odoo, CRUD/actor, restart, and other broader Manufacturing gates remain
open. No module sign-off or aggregate progress claim.

Detailed execution matrix: [`test-plans/manufacturing.md`](test-plans/manufacturing.md). It is the module-level source for manufacturing CRUD, workflows, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| MANUFACTURING-001 | Full focused contract corpus and route matrix | 59 focused tests / 674 assertions; 32 routes × desktop/mobile = 64/64; no page/request errors or overflow | PASS |
| MANUFACTURING-002 | Authenticated work-order lifecycle and stale boundary | Admin `wo-blocked-001`: Waiting → Ready → Progress/paused → Ready → Blocked, versions 1 → 6; stale plan 409 | PASS |
| MANUFACTURING-003 | Permission boundary | Fleet user plan action returned 403 `manufacturing.write` | PASS |
| MANUFACTURING-004 | Fresh paired Odoo/Core3 visual comparison for every accepted surface | Existing source captures are recorded, but no fresh current-wave pair is adjudicated | pending |

## R2 dispatch

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-MANUFACTURING-WAVE-20260913-R2` → `QA-MANUFACTURING-WAVE-20260913-R2` | existing `agent/odoo-ui-manufacturing-work-orders-analysis` in `/home/nhanjs/projects/core3-worktrees/odoo-ui-manufacturing-work-orders-analysis` | Work Orders Analysis graph/pivot/list/detail actor and company boundaries, 401/403 refusal, wrong-company isolation, and focused deterministic empty/guard tests | dispatched in `37515e06`; awaiting self-contained product commit before QA |

| `DEV-MANUFACTURING-TRANSPORT-WAVE-20260913-R2` → `QA-MANUFACTURING-TRANSPORT-WAVE-20260913-R2` | existing `agent/odoo-ui-manufacturing-work-orders-analysis-transport` in `/home/nhanjs/projects/core3-worktrees/odoo-ui-manufacturing-work-orders-analysis-transport` | Work Orders Analysis filter/measure validation, company-scoped report results, explicit empty/missing/invalid/transport states, and focused refusal tests | dispatched in `71312eb3`; awaiting self-contained product commit before QA |

| `DEV-MANUFACTURING-SCOPE-WAVE-20260913-R2` → `QA-MANUFACTURING-SCOPE-WAVE-20260913-R2` | existing `agent/odoo-ui-manufacturing-work-orders-analysis-scope` in `/home/nhanjs/projects/core3-worktrees/odoo-ui-manufacturing-work-orders-analysis-scope` | Grouped Work Orders Analysis dimensions/filters, company scope, deterministic empty/invalid handling, and focused refusal tests | dispatched in `b42778e5`; awaiting self-contained product commit before QA |

| `DEV-MANUFACTURING-TRANSPORT-UI-WAVE-20260913-R2` → `QA-MANUFACTURING-TRANSPORT-UI-WAVE-20260913-R2` | existing `agent/odoo-ui-manufacturing-work-orders-analysis-transport-ui` in `/home/nhanjs/projects/core3-worktrees/odoo-ui-manufacturing-work-orders-analysis-transport-ui` | Work Orders Analysis report export/print binding, scoped projection, permission/error boundaries, and focused no-side-effect tests | dispatched in `0c89cff9`; awaiting self-contained product commit before QA |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| MANUFACTURING-BROWSER-001 | Current candidate had no verified QA evidence | — | Replaced by MANUFACTURING-001 through 003 | closed |

## Sign-off

- Functional: pass for current tested contracts and work-order lifecycle
- Permissions: pass for tested read/write boundary
- Persistence/data integrity: pass for tested workflow row versions/state changes
- Desktop/mobile visual parity: pending
- Tester decision: conditional; no module sign-off until paired Odoo and remaining interaction gates close

## 2026-09-21 Work Centers Overview bounded slice

- Source basis: local Odoo 19 `mrp_workcenter_kanban_action` / `mrp_workcenter_kanban` in `addons/mrp/views/mrp_workcenter_views.xml`; distinct from the completed configuration Work Centers action.
- Product evidence: `test/manufacturing_work_center_overview.integration.test.ts` passes 3 tests / 22 assertions. The isolated Manufacturing discovery audit passes 33 pages / 36 routes / 68 datasources; targeted ESLint and `git diff --check` pass.
- Browser blocker: the authenticated shared Odoo browser instance `245ea108` rendered Discuss at `http://localhost:8069/odoo`; the Manufacturing launcher was absent and `/odoo/manufacturing` redirected to Discuss. The Core3 runtime reached its login page, but the browser profile had no Core3 session and the browser-skill login-help request received no human completion. No desktop/mobile screenshot pair was obtained, and no visual parity or module sign-off is claimed.

## Merge review record — candidate `383583f6` / QA `112ed911`

- The QA results were retained as conditional evidence: 10 tests/108
  assertions, audit, CSS build, and diff check passed; authenticated browser,
  actor/restart, and paired Odoo gates remained open.
- The product candidate was not integrated because its API/page/test files
  conflict with the active Work Orders Analysis implementation. No
  Manufacturing sign-off is implied.
## 2026-09-13 coordinator dispatch — bounded scrap/unbuild wave

- Existing owner `agent/odoo-ui-manufacturing-next-wave` is assigned on
  `/home/nhanjs/projects/core3-worktrees/odoo-ui-manufacturing-next-wave`,
  based at `72919440`. Development event:
  `DEV-MANUFACTURING-WAVE-20260913-R2`; QA event:
  `QA-MANUFACTURING-WAVE-20260913-R2`; handoff commit: `db8b6f4a`.
- Scope is a bounded scrap/unbuild mutation slice preserving MO/move
  relations, quantity/state validation, company/permission scope, stale
  guards, and atomic no-partial-write tests. Candidate pending; existing
  ledgers and aggregate progress are preserved.
## DEV/QA reconciliation — `DEV-MANUFACTURING-WAVE-20260913-R2` / `QA-MANUFACTURING-WAVE-20260913-R2`

- The owner handoff `db8b6f4a` requested scrap/unbuild work, but authoritative
  main already contains the implementation and parity history, including
  `dd140fd1` (`feat(inventory): add scrap orders parity slice`) and the current
  Manufacturing-owned contracts/tests. No duplicate owner product commit is
  required.
- QA event triggered/reconciled against the current implementation. Active
  checkout command `bun test test/manufacturing_scrap_orders.integration.test.ts
  test/manufacturing_unbuild_orders.integration.test.ts` passed **8 tests / 97
  assertions**, covering page/API separation, Odoo action/menu/field contracts,
  deterministic fixtures, create/edit/validate/unbuild, stale guards, and
  completed-record deletion guards.
- Disposition: **bounded QA pass; conditionally accepted**. Broader
  Manufacturing blockers remain preserved: authenticated CRUD/actor and
  restart evidence, paired Odoo visual comparison, Temporal/integration gates,
  and complete module sign-off.

## QA retest — Work Orders Analysis scope candidate `cbd5d72f` (2026-09-13)

- Candidate worktree: `/home/nhanjs/projects/core3-worktrees/odoo-ui-manufacturing-work-orders-analysis`,
  owner `agent/odoo-ui-manufacturing-work-orders-analysis`, exact HEAD
  `cbd5d72f`. The owner worktree is dirty only because QA documentation was
  updated; no unrelated product changes were accepted.
- Bounded API evidence passed: company scoping, caller-parameter spoof
  protection, fail-closed behavior, 401/403/404/503 contracts, and **10 tests /
  117 assertions**. Candidate integration is held.
- `MANUFACTURING-SCOPE-001`: live Vietnam fixture rows belong to **Core3
  Vietnam**, while the authenticated browser company is **Core3 Vietnam
  Branch**, so the live scoped dataset is empty. Align deterministic fixture
  company context and add a live non-empty company-switch proof.
- `MANUFACTURING-BROWSER-002`: authenticated browser rendering is blocked by
  Vite serving `PageField` with the wrong MIME type. Trace the actual asset
  resolution/serving path and repair it in the same owner worktree; do not
  paper over the report scope predicates.
- Repository-wide lint has no executable `bun run lint` script in this
  candidate checkout; preserve that tooling limitation rather than claiming a
  repository lint pass.

### Disposition and repair handoff

- **BLOCKED — do not integrate `cbd5d72f`.** Route a same-worktree repair to
  `agent/odoo-ui-manufacturing-work-orders-analysis` at the exact path above.
  Require fixture/company-context alignment, root-cause Vite `PageField` MIME
  repair, focused runtime tests, and a fresh authenticated browser proof
  before re-triggering `QA-MANUFACTURING-WAVE-20260913-R2`.
- Preserve the existing API pass and broader restart, actor, Temporal, and
  paired-Odoo gates; no Manufacturing module sign-off is made.

## QA retest — live browser repair `dcedc46b` (2026-09-13)

- The same owner/worktree is now at exact HEAD `dcedc46b`:
  `/home/nhanjs/projects/core3-worktrees/odoo-ui-manufacturing-work-orders-analysis`
  on `agent/odoo-ui-manufacturing-work-orders-analysis`. QA documentation is
  the only reported worktree modification.
- API/company scoping, guard contracts, migration, build, audit, targeted
  ESLint, and diff-check gates pass. Integration remains held.
- `MFG-BROWSER-001` remains open: the live Vite server still serves
  `/packages/client/src/components/PageField` as `text/html`, leaving
  `/manufacturing/workorders` blank at both desktop and mobile viewports.

### Disposition and next handoff

- **BLOCKED — do not integrate `dcedc46b`.** Route a same-worktree live-server
  repair to the existing Manufacturing owner. Trace the actual Vite/module
  resolution and MIME response path, fix the root cause, and provide a fresh
  authenticated desktop/mobile proof that `/manufacturing/workorders` renders
  before triggering `QA-MANUFACTURING-WAVE-20260913-R2` again.
- Preserve the API pass, repository-lint limitation, restart/Temporal, and
  paired-Odoo gates. No Manufacturing sign-off is made.

## Coordinator reconciliation — final repair `db7c31a8` (2026-09-13)

- Reviewed owner HEAD `db7c31a8` in
  `/home/nhanjs/projects/core3-worktrees/odoo-ui-manufacturing-work-orders-analysis`
  on `agent/odoo-ui-manufacturing-work-orders-analysis`; only QA
  documentation is dirty.
- Integrated the valid live-server repair as active `1dc88184`, adding the
  workspace source bridge and binding Vite to `127.0.0.1`. Active verification
  passed the established Manufacturing focused suite (**5 tests / 50
  assertions**), audit (**661 pages / 670 routes / 1161 datasources**),
  frontend/CSS build, targeted ESLint, and diff-check.
- The `cbd5d72f` model-replacement portion was not cherry-picked verbatim: it
  replaces the active `mrp_workorder_analysis` graph/pivot/detail contracts
  with different `mrp_workorders` page/API IDs and would discard active
  behavior. The active report already carries the company-scoped
  `mrp_workorder_analysis` contract; no replacement model or unrelated route
  was imported.
- QA PASS is reconciled for live PageField JavaScript, authenticated
  desktop/mobile rendering, Demo/Vietnam Branch isolation and spoof
  protection, guards, migrations, **11 tests / 124 assertions**, builds,
  audit, ESLint, and diff-check.
- Disposition: **conditionally integrated bounded live-browser repair** as
  `1dc88184`; no Manufacturing full sign-off. Restart durability,
  Temporal/integration coverage, paired authenticated Odoo comparison, and
  repository-wide lint remain open or limited.
