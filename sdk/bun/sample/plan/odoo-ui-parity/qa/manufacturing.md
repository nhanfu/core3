# manufacturing QA ledger

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

Detailed execution matrix: [`test-plans/manufacturing.md`](test-plans/manufacturing.md). It is the module-level source for manufacturing CRUD, workflows, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| MANUFACTURING-001 | Full focused contract corpus and route matrix | 59 focused tests / 674 assertions; 32 routes × desktop/mobile = 64/64; no page/request errors or overflow | PASS |
| MANUFACTURING-002 | Authenticated work-order lifecycle and stale boundary | Admin `wo-blocked-001`: Waiting → Ready → Progress/paused → Ready → Blocked, versions 1 → 6; stale plan 409 | PASS |
| MANUFACTURING-003 | Permission boundary | Fleet user plan action returned 403 `manufacturing.write` | PASS |
| MANUFACTURING-004 | Fresh paired Odoo/Core3 visual comparison for every accepted surface | Existing source captures are recorded, but no fresh current-wave pair is adjudicated | pending |

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

## Merge review record — candidate `383583f6` / QA `112ed911`

- The QA results were retained as conditional evidence: 10 tests/108
  assertions, audit, CSS build, and diff check passed; authenticated browser,
  actor/restart, and paired Odoo gates remained open.
- The product candidate was not integrated because its API/page/test files
  conflict with the active Work Orders Analysis implementation. No
  Manufacturing sign-off is implied.
