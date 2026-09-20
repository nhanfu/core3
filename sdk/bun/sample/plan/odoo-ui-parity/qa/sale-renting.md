# sale-renting QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/sale-renting-desktop.png and sale-renting-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: focused Core3 slice signed off; Odoo comparison blocked by missing addon
QA slot: sale-renting owner validation complete
Module owner: sale-renting module owner
Verification trigger: feature-complete
Implementation commit: `3c4210ab`

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| SALE_RENTING-INV-001 | Reference addon/menu/action/view inventory | Authenticated RPC inventory in `rental.md` dated 2026-09-20 | pass: source gate remains blocked |
| SALE_RENTING-API-001 | Each rental page joins its backend API fragment by `page.id` and exposes real datasource SQL/actions | Clean-worktree discovery and focused page/API validator | pass: 661 pages, 670 routes, 1,162 datasources |
| SALE_RENTING-ROUTE-001 | Rental Events is reachable at `/rental-events`, not the Events module's `/events` route | Authenticated Core3 desktop/mobile route capture | pass: `/rental-events` resolves to `/sale-renting/rental-events` and renders Rental Events |
| SALE_RENTING-FUNC-001 | Read deterministic rentals and rental event history after migration | Authenticated page queries and reload assertion | pass: two rental fixtures and one event fixture read successfully |
| SALE_RENTING-CRUD-001 | Create a quotation, edit it while in Quotation, reject invalid dates/quantity, and persist after reload | `sale_renting.integration.test.ts`, authenticated action smoke | pass: edit increments `row_version`; invalid quantity/date return 422; stale edit returns 409 `STALE_RECORD`; create/edit/cancel persist |
| SALE_RENTING-WF-001 | Reserve, pick up, return, and cancel only from allowed states; append event history | Focused integration test plus authenticated action smoke | pass: reserve/pickup/return persisted `Returned` plus three events; cancel succeeds; stale cancel, overlap, and missing-date reserve are rejected; availability reflects reservations |
| SALE_RENTING-PERM-001 | `rental.read`, `rental.write`, and `rental.manage` boundaries hold for page/API/action access | Direct unauthorized/forbidden API responses | pass: unauthenticated 401; dispatcher 403 for read and create |
| SALE_RENTING-RESP-001 | Rental list/detail/events render at 1440x900 and 390x844 without overflow | `/tmp/core3-odoo-parity/sale-renting-*` captures and browser console log | pass: seeded Rental Events rendered with no page/5xx errors or overflow |
| SALE_RENTING-PENDING-001 | Full Odoo Rental functionality and paired visual parity | No installable Odoo `sale_renting` reference surface | blocked |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| SALE_RENTING-REG-001 | Guard the focused validation and lifecycle increment | `3c4210ab` | `bun test ./test/sale_renting.integration.test.ts` | pass |

## Focused execution evidence (2026-09-20)

- `bun test ./test/sale_renting.integration.test.ts`: passed — 3 tests, 46
  assertions.
- `bun run audit`: passed — 661 pages, 670 routes, 1,162 datasources.
- `git diff --check`: passed before the implementation commit and again for
  this evidence update.
- Authenticated API smoke: admin/dispatcher login 200/200; unauthenticated
  rental read 401; dispatcher rental read/create 403; admin create/edit/cancel
  succeeded; stale edit returned 409 `STALE_RECORD`; invalid quantity/date
  returned 422 `RENTAL_VALUES_INVALID`/`RENTAL_DATES_INVALID`; overlapping
  reserve returned 409 `RENTAL_PERIOD_OVERLAP`; missing-date reserve returned
  422 `RENTAL_DATES_REQUIRED`; availability reported the reserved quantity.
- Authenticated Playwright smoke: passed at 1440x900 and 390x844. Desktop
  `/rental-events` resolved to `/sale-renting/rental-events`; mobile
  `/rentals` resolved to `/sale-renting/rentals`. Both showed seeded data with
  no page errors, 5xx responses, or horizontal overflow. Artifacts
  `/tmp/core3-odoo-parity/sale-renting-desktop.png` and
  `/tmp/core3-odoo-parity/sale-renting-mobile.png` are outside Git.
- Full Odoo Rental parity remains blocked because the live reference has no
  installed `sale_renting` addon or Rental menu/action/view surface.

## Sign-off

- Functional: pass for the documented Core3 slice
- Permissions: pass for the documented Core3 boundary
- Persistence/data integrity: pass for validation, stale-write, lifecycle,
  event, overlap, and availability cases
- Desktop/mobile route smoke: pass; Odoo visual parity remains unverified
- Tester decision: focused Core3 slice signed off; full Odoo parity blocked by
  the missing `sale_renting` addon/source surface
