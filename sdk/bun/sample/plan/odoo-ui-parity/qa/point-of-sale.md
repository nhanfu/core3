# point-of-sale QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/point-of-sale-desktop.png and point-of-sale-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: QA-2
Module owner: point-of-sale module owner
Verification trigger: feature-complete
Candidate commit: `b9eb2ea1`

## QA-2 verification of developer candidate `b9eb2ea1` (2026-09-13)

- Candidate worktree: `/home/nhanjs/projects/core3-worktrees/odoo-pos-visual-nav-20260913`, branch `agent/odoo-pos-visual-nav-20260913`; initial status was clean.
- Candidate regression test: `bun test ./test/pos_visual_navigation.integration.test.ts --timeout 20000` — **2 passed, 0 failed, 7 assertions**. It verifies launcher wrapper/inner-SVG bounds and both Orders row-open/double-click actions to `/point-of-sale/order-detail` with `{row.id}`.
- UI audit: `bun run audit` — **passed**, 659 pages, 668 routes, 1,139 datasources.
- CSS: `bun run css:build:global && bun run css:build:point-of-sale` — **passed**; generated outputs were unchanged.
- Diff hygiene: `git diff --check HEAD` — **passed**.
- Repository lint: **failed** on two existing errors in `sample/test/website_public.integration.test.ts:31:19` and `:33:19` (`no-unsafe-optional-chaining`); no POS-file lint error was reported.
- Full POS corpus: `bun test ./test/pos*.integration.test.ts --timeout 20000` was started but hung during execution and was terminated at bounded finalization. No full-suite pass is claimed.
- Candidate runtime was started on backend `4340` / Vite `4341` with `bun run dev --db=ddb --memory`, then stopped. The authenticated browser probe exceeded its bounded window and produced no usable result or capture.
- Captures: none from `b9eb2ea1`. Existing `/tmp/pos-qa-cdbc38ee-*` and prior captures are not retested evidence for this candidate.
- Odoo: `http://127.0.0.1:8069/web/database/selector` returned HTTP 200, but no authenticated paired POS capture was produced.
- Actor boundaries, restart persistence, full desktop/mobile route evidence, and authenticated Orders-row detail navigation remain unverified.

QA decision: **conditional / retest pending**. The candidate-specific static and contract checks pass, but the requested browser, full-corpus, actor/restart, and paired-Odoo evidence gates are incomplete. No module sign-off is made.

## QA-2 verification of integrated candidate `cdbc38ee` (2026-09-13)

- POS corpus: **84 passed, 700 assertions, 0 failures** across 24 files in
  104.67s (`bun test ./test/pos*.integration.test.ts --timeout 20000`).
- `bun run audit`: **659 pages, 668 routes, 1,134 datasources**, passed.
- Authenticated desktop route matrix: **72/72 registered POS routes loaded**
  at 1440x900; 0 console errors, 0 page errors, 0 failed requests, 0 HTTP
  responses >=400, and 0 horizontal-overflow results.
- Authenticated mobile smoke for `/point-of-sale/touch`,
  `/point-of-sale/orders`, and `/point-of-sale/configs` at 390x844 rendered
  with `overflow=false`.
- Captures: `/tmp/pos-qa-cdbc38ee-orders-desktop.png`,
  `/tmp/pos-qa-cdbc38ee-touch-desktop.png`,
  `/tmp/pos-qa-cdbc38ee-orders-mobile.png`,
  `/tmp/pos-qa-cdbc38ee-touch-mobile.png`, and
  `/tmp/pos-qa-cdbc38ee-configs-mobile.png`.
- Visual inspection found the global launcher/icon glyphs rendered at extreme
  sizes and pushing POS content far below the fold. This is an open visual
  parity finding; clean network/error/overflow telemetry does not constitute
  visual sign-off.
- The candidate route contract passes for `view_pos_order`, but a fresh
  browser click-through from an Orders row to the repaired detail route was
  not separately established in this event.

Detailed execution matrix: [`test-plans/point-of-sale.md`](test-plans/point-of-sale.md). It is the module-level source for the remaining route, CRUD, actor, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| POINT_OF_SALE-001 | POS focused contract corpus | 84 tests / 700 assertions across 24 files; 0 failures | PASS |
| POINT_OF_SALE-002 | Touch route responsive render | Authenticated `/point-of-sale/touch` rendered at 1440x900 and 390x844 with House coffee, no page/request errors, HTTP failures, or overflow | PASS |
| POINT_OF_SALE-003 | Cashier persistence and payment guards | Opening cash persisted; product add recalculated 7.70; overpayment 400; Cash payment persisted Paid 7.70 | PASS |
| POINT_OF_SALE-004 | Permission boundary | Fleet payment attempt returned 403 `pos.write` | PASS |
| POINT_OF_SALE-004A | POS Orders row interaction | Candidate contract resolves `view_pos_order` to `/point-of-sale/order-detail` and preserves the row ID; 13/13, 69 assertions | PASS (contract) |
| POINT_OF_SALE-004B | Authenticated route matrix | 72/72 POS routes loaded on desktop; 0 console/page errors, failed requests, HTTP >=400 responses, or horizontal overflow | PASS (route smoke) |
| POINT_OF_SALE-005 | Complete route interaction and fresh paired Odoo comparison | Existing module captures are recorded, but current-wave full route interaction and paired adjudication are incomplete | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| POINT_OF_SALE-BROWSER-001 | Initial full-route harness reused a page and captured late requests from the previous route | — | Discarded; isolated touch contexts rerun cleanly | closed |
| POINT_OF_SALE-VISUAL-001 | Authenticated desktop/mobile captures show oversized global launcher/icon glyphs and POS content displaced far below the fold | `cdbc38ee` | `pos_visual_navigation.integration.test.ts` verifies bounded wrapper/inner SVG selectors; global and POS CSS builds pass. A fresh post-fix screenshot was not completed before the bounded probe was stopped. | retest pending |

## Sign-off

- Functional: pass for the tested cashier/touch slice and POS Orders row route contract
- Permissions: pass for the tested write boundary
- Persistence/data integrity: pass for the tested session/order/payment flow
- Desktop/mobile visual parity: **fail/open** for `POINT_OF_SALE-VISUAL-001`; module parity pending
- Tester decision: conditional; broader route and paired Odoo gates remain open

## DEV follow-up: launcher bounds and Orders navigation (2026-09-13)

- Dedicated worktree/branch: `agent/odoo-pos-visual-nav-20260913`.
- The shared launcher stylesheet now bounds the `.svg-icon` wrapper and inner
  SVG for the switcher, launcher tiles, close control, and search control;
  generic SVG sizing cannot expand those glyphs to the tile or viewport.
- The Orders YAML contract retains both row-open and double-click actions to
  `/point-of-sale/order-detail` with `{row.id}`. The focused test records this
  alongside the CSS regression guard.
- Focused verification: 15 POS tests passed, 76 assertions; `bun run audit`
  passed (659 pages, 668 routes, 1,139 datasources); global and POS CSS builds
  passed; `git diff --check` passed before commit.
- Browser limitation: the isolated server was stopped at the user-requested
  bounded-finalization point. No post-fix desktop/mobile screenshot or fresh
  click-through is claimed; `POINT_OF_SALE-VISUAL-001` remains retest pending.

## Reviewer disposition — candidate `bcf33752`

- Integrated on the active branch as `ca87d3ef`; the bounded POS configuration
  detail edit preserves existing session guards and adds editable company,
  currency, and receipt fields with optimistic concurrency and validation.
- Post-merge verification passed: POS focused subset 15 tests / 82 assertions,
  UI audit (659 pages / 668 routes / 1147 datasources), installed-Sass global
  and POS builds, and `git diff --check`.
- Package Sass PATH shim limitation remains recorded. Authenticated Core3
  desktop/mobile and Odoo browser evidence remain unavailable. POS remains
  conditional / unsigned-off; visual and broader module gates remain open.

## 2026-09-13 coordinator review: repair candidate `03d8b8ff`

- Integrated the bounded POS configuration migration-replay and duplicate-
  guard test repair as `fbdb2d52`. The candidate changed one POS-owned test
  file; active configuration contracts were preserved.
- Post-merge focused test passed: **2 tests, 14 assertions**. Candidate POS
  evidence remains **33 tests, 223 assertions**; migration replay, guards,
  audit (**661 pages, 670 routes, 1154 datasources**), global/POS CSS, and
  diff-check passed.
- POS remains **conditional / unsigned-off**. Core3 runtime, authenticated
  browser, actor, restart, desktop/mobile, and paired Odoo evidence remain
  blocked by the unavailable `js_repl`/Playwright session and stopped runtime.
