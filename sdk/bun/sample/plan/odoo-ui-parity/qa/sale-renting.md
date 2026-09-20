# sale-renting QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/sale-renting-desktop.png and sale-renting-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: focused Core3 slice verified; Odoo comparison blocked by missing addon
QA slot: dispatchable sale-renting assignment (pending wave dispatch)
Module owner: sale-renting module owner
Verification trigger: feature-complete
Candidate commit: `2ddc1e28e3c57c5f80a7f664d258c15d00a89b60`

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| SALE_RENTING-INV-001 | Reference addon/menu/action/view inventory | Authenticated RPC inventory in `rental.md` dated 2026-09-20 | pass: source gate remains blocked |
| SALE_RENTING-API-001 | Each rental page joins its backend API fragment by `page.id` and exposes real datasource SQL/actions | Clean-worktree discovery and focused page/API validator | pass: 661 pages, 670 routes, 1,162 datasources |
| SALE_RENTING-ROUTE-001 | Rental Events is reachable at `/rental-events`, not the Events module's `/events` route | Authenticated Core3 desktop/mobile route capture | pass: `/rental-events` resolves to `/sale-renting/rental-events` and renders Rental Events |
| SALE_RENTING-FUNC-001 | Read deterministic rentals and rental event history after migration | Authenticated page queries and reload assertion | pass: two rental fixtures and one event fixture read successfully |
| SALE_RENTING-CRUD-001 | Create a quotation, edit it while in Quotation, reject invalid dates/quantity, and persist after reload | Core3 action response plus database query | partial: create/read/lifecycle persistence verified; edit/invalid-input cases remain unexecuted |
| SALE_RENTING-WF-001 | Reserve, pick up, return, and cancel only from allowed states; append event history | Action responses, state/event queries, stale/overlap negative cases | pass: reserve, pickup, return persisted `Returned` plus three events; cancel/stale/overlap remain unexecuted |
| SALE_RENTING-PERM-001 | `rental.read`, `rental.write`, and `rental.manage` boundaries hold for page/API/action access | Direct unauthorized/forbidden API responses | pass: unauthenticated 401; dispatcher 403 for read and create |
| SALE_RENTING-RESP-001 | Rental list/detail/events render at 1440x900 and 390x844 without overflow | `/tmp/core3-odoo-parity/sale-renting-*` captures and browser console log | pass: seeded Rental Events rendered with no page/5xx errors or overflow |
| SALE_RENTING-PENDING-001 | Full Odoo Rental functionality and paired visual parity | No installable Odoo `sale_renting` reference surface | blocked |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| — | No current-wave QA run | — | — | pending |

## Focused execution evidence (2026-09-20)

- `git diff --check HEAD^ HEAD`: passed.
- `bun run audit` from a clean temporary worktree: passed — 661 pages, 670
  routes, 1,162 datasources.
- Authenticated API smoke: passed — admin query/create/reserve/pick-up/return
  and reload; unauthenticated 401; dispatcher 403.
- Authenticated Playwright smoke: passed at 1440x900 and 390x844; artifacts
  `/tmp/core3-odoo-parity/sale-renting-desktop.png` and
  `/tmp/core3-odoo-parity/sale-renting-mobile.png` are outside Git.
- Full Odoo Rental parity remains blocked because the live reference has no
  installed `sale_renting` addon or Rental menu/action/view surface.

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
