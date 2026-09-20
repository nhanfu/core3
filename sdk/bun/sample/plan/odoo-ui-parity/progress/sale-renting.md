# sale-renting parity progress

Module owner: sale-renting module owner
QA assignment: sale-renting owner validation complete
Status: blocked-reference / focused implementation verified
Verification trigger: focused Core3 slice complete, then reference re-audit
Implementation commit: `3c4210ab`

## Current state

The 2026-09-20 authenticated reference audit found no installed `sale_renting`
addon, Rental menu, rental action, rental view, or rental-specific fields. The
source gate remains blocked and no Odoo parity claim is made. Core3 already
has deterministic rental persistence, page contracts, and workflow YAML. The
accepted implementation now keeps backend API/action YAML separate from page
layout YAML, exposes the service-owned `/rental-events` route, and guards edit
validation, invalid values/dates, cancellation, stale writes, overlap, and
availability behavior.

## Next bounded task

The next gate is a fresh reference audit if a matching Odoo `sale_renting`
source bundle becomes available. Remaining Core3 management cases such as
delete/archive/import/export are intentionally outside this bounded slice.
No Odoo-derived labels, menu claims, or visual parity are signed off.

## Current evidence

- Reference inventory: `rental.md`, current live reference audit dated
  2026-09-20; `sale_renting` is absent from `ir.module.module`.
- Core3 baseline: service-owned rental pages, migrations, permissions, and
  workflow are present; the service-owned events path is `/rental-events`.
- Implementation commit: `3c4210ab` (parent route/API boundary commit:
  `2ddc1e28`).
- Focused discovery passed in a clean worktree: 661 pages, 670 routes, and
  1,162 datasources.
- Focused integration passed: 3 tests and 46 assertions covering page/API
  joining, edit validation, invalid dates/quantity, stale writes, cancel,
  overlap, missing-date reservation, availability, and permission contracts.
- Authenticated Core3 lifecycle passed: admin read two seeded rentals, created
  a quotation, edited and cancelled it, and separately reserved, picked up,
  and returned a rental with three persisted event rows.
- Permission boundary passed: unauthenticated read returned 401; dispatcher
  rental read/create returned 403; admin actions succeeded.
- Invalid and concurrency boundaries passed: 422 validation errors,
  `STALE_RECORD` 409, `RENTAL_PERIOD_OVERLAP` 409, and
  `RENTAL_DATES_REQUIRED` 422 were observed.
- Browser smoke passed at 1440x900 and 390x844; `/rental-events` resolved to
  `/sale-renting/rental-events` and `/rentals` resolved to
  `/sale-renting/rentals`, with seeded data, no page/5xx errors, and no
  horizontal overflow.
  Captures are under `/tmp/core3-odoo-parity/` and are not committed.
