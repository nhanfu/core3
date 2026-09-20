# EMP-BANK-ALLOCATION-001 verification

## Implementation

Core3 adds the page/API-separated `employee-bank-allocation` contract at
`/employees/bank-allocations`. The employee detail Personal bank-account grid
opens it; the allocation page edits durable account amount/type/trust lines and
saves the distribution through a guarded server action. Percentage totals must
equal 100% when percentage lines exist. Migration `20260921110000-041` records
successful saves in `employee_bank_allocation_runs` and is idempotent.

## Focused verification

`bun test test/employees_bank_allocation.integration.test.ts`

- 4 passed, 0 failed
- 26 assertions
- Covers Odoo wizard/action mapping, page/API separation, line CRUD, exact-total
  validation, actor/company/parent-row/line-row guards, save audit persistence,
  migration replay, and file-backed restart.

Scoped ESLint and `git diff --check` are recorded for the final candidate.
Full-repository regression is intentionally not part of this bounded slice.

## Authenticated browser evidence

Core3 desktop/mobile authenticated routes and Odoo desktop/mobile Personal-tab
captures are retained in the JSON/PNG files. The deterministic Core3 bank rows
belong to `Core3 Vietnam`, while the authenticated Core3 session is scoped to
`Core3 Demo Company`, so the allocation page renders its guarded empty state.
The authenticated Odoo reference employee has no bank-account rows, so its
allocation action has no populated lines to exercise. No populated browser
mutation claim is made.

## Disposition

Durable contracts, validation, permissions, concurrency, save history, and
restart behavior pass. Browser comparison is conditional on matching fixtures;
no aggregate Employees sign-off is claimed.
