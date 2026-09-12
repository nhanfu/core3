# spreadsheet QA ledger

## Candidate QA run (2026-09-13)

- Candidate: `bbf5c539` (`agent/spreadsheet-runtime-filters-20260913`)
- Scope: per-user dashboard date-filter persistence and related guards.
- Product code was not changed by QA. This run edits only this ledger and the
  matching progress file.

### Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Focused Spreadsheet regression | pass | `bun test ./test/spreadsheet.integration.test.ts`: 11 pass, 0 fail, 114 expect calls, 3.64s. |
| Per-user filter persistence | pass at repository/contract level | Viewer fixture changes `This month` → `This week`, returns row version 2, and re-query returns `This week`; migration reapplied twice with 3 rows. |
| Cross-user isolation / permission guard | pass at repository/contract level | Other user update rejected with HTTP 403 `SPREADSHEET_DASHBOARD_FILTER_FORBIDDEN`. Source query is constrained by `user_id = :current_user_id`. |
| Invalid range guard | pass at repository/contract level | `Tomorrow` rejected with HTTP 422 `SPREADSHEET_DASHBOARD_FILTER_INVALID`; valid options are Today, This week, This month, This year. |
| Stale/concurrent filter update | pass at repository/contract level | Reusing row version 1 after save rejected with HTTP 409. |
| Share concurrency | pass at repository/contract level | Existing share test rejects stale row version with HTTP 409 `SPREADSHEET_DASHBOARD_SHARE_STALE`; candidate adds an atomic `UPDATE ... WHERE row_version = :expected_row_version` step. |
| CSS | pass | Spreadsheet SCSS compiled to `/tmp/core3-spreadsheet-qa.css` (SHA-256 `7f9c51a782e97a32ea593e47efd251049e11e5b957dc54dea30f0ce1edcfddd5`). |
| Targeted lint | pass | ESLint passed for `packages/client/src/components/SpreadsheetDashboardClientAction.ts` and `packages/server/src/yaml/schema.ts`. |
| UI audit | pass | `bun scripts/audit-order-ui.ts`: 659 pages, 668 routes, 1,137 datasources; audit passed. |
| Diff check | pass | `git diff --check bbf5c539^ bbf5c539` produced no output. |

### Browser and runtime boundary

No authenticated desktop/mobile or paired Odoo captures were produced for this
candidate. The documented interactive Playwright `js_repl` session is not
available in this Codex session, and the temporary Chrome probe was already
occupied by unrelated sessions. A fresh candidate dev server did start
(`:3001` backend, `:3002` Vite), but its authenticated page/source registry
returned only the blog page set: `/api/pages/dashboards` and
`spreadsheet_dashboard_filter_state` both returned 404 while `/api/modules`
listed the Spreadsheet manifest. This is a runtime-readiness blocker for
browser evidence, not a product-code finding from this QA run.

No screenshot paths are claimed for this candidate. Existing
`/tmp/core3-odoo-parity/module-matrix-20260912/spreadsheet-desktop.png` and
`spreadsheet-mobile.png` are prior route-smoke artifacts and were not reused
as candidate evidence.

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/spreadsheet-desktop.png and spreadsheet-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: active
QA slot: dispatchable spreadsheet assignment (pending wave dispatch)
Module owner: spreadsheet module owner
Verification trigger: feature-complete
Candidate commit: pending commit for dashboard lifecycle

Detailed execution matrix: [`test-plans/spreadsheet.md`](test-plans/spreadsheet.md). It is the module-level source for dashboards, workbook runtime, sharing, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| SPREADSHEET-CANDIDATE-001 | Candidate date-filter persistence, reload-equivalent re-query, cross-user isolation, invalid/stale guards, share concurrency, and static gates | Focused suite and repository evidence above; browser/runtime blocker recorded above | pass for contract/static scope; browser pending |
| SPREADSHEET-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Candidate does not cover full module gates | pending |
| SPREADSHEET-WORKFLOW-001 | Dashboard publish/archive lifecycle | Focused test executes Draft → Published → Archived, persists `published` and row versions 1 → 3, rejects stale publish and non-manager archive | pass |
| SPREADSHEET-FUNC-001 | Dashboard configuration and public share contracts | `bun test ./test/spreadsheet.integration.test.ts` — 10 tests, 103 assertions | pass for focused contract/workflow scope |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| SPREADSHEET-BROWSER-001 | Candidate dev runtime did not expose Spreadsheet page/source registry to authenticated API (`/api/pages/dashboards` and filter source 404; `/api/modules` listed module) | — | Re-run authenticated desktop/mobile/Odoo matrix with a clean candidate runtime | blocked for browser evidence |

## Sign-off

- Functional: pass for candidate contract slice; full module pending
- Permissions: pass for candidate filter guard contract; full actor/company matrix pending
- Persistence/data integrity: pass for repository slice; authenticated reload/restart pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
