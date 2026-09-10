# Expenses parity batch 3: Expense Categories CRUD and archive boundary

Status: implemented in `agent/odoo-ui-expenses-next-20260910`.

## Reference discovery

The current owned Odoo reference was re-authenticated after the 2026-09-10
restart at `http://localhost:8069` using the plan credentials. The installed
`hr_expense` application rendered demo data. The complete visible Expenses
menu inventory was:

- `My Expenses` → `My Expenses` (`/odoo/expenses`) and `Expenses to Process`
  (`/odoo/expenses-to-process`)
- `Reporting` → `Expenses Analysis` (`/odoo/expenses-analysis`)
- `Configuration` → `Settings` (`/odoo/action-605`) and `Expense Categories`
  (`/odoo/action-595`)

The loaded My Expenses screen showed eight demo expenses. The selected next
uncovered action was `Expense Categories`: the existing Core3 page had a
read/create surface but no edit, archive, restore, manager boundary, or
archived fixture. Odoo's loaded category screen showed six categories, list
mode on desktop, kanban mode on mobile, and the visible columns `Name`,
`Reference`, `Note`, `Sales Price`, `Cost`, `Purchase Taxes`, and
`Re-Invoice Costs`.

## Bounded implementation

- Moved category actions out of page YAML into `services/expenses/api/categories.yaml`, joined by `page.id: expense-categories`.
- Added manager-only read/write permission metadata, active/archived filtering, deterministic empty and transport-error states, and duplicate-name guards.
- Added shared edit form, create, archive, and unarchive actions with optimistic concurrency checks.
- Added the stable archived `Archived Meal Voucher` fixture in migration `0.0.6`; the migration is idempotent.
- Exposed separate Expenses `Reporting` and `Configuration` manifest groups, preserving the owned Odoo menu hierarchy and manager-only category/settings visibility.
- Kept the shared `ListView` list/kanban tabs and responsive card rendering; no Expenses-specific renderer was introduced.

## Verification

- `bun test test/expenses_categories.integration.test.ts test/expenses_next.integration.test.ts`: 7 passed, 59 assertions.
- `bun run audit`: passed, 350 pages / 355 routes / 623 datasources.
- `git diff --check`: passed.
- Authenticated Core3 browser verification used the isolated runtime at
  `http://localhost:3102` with `admin@tms.local / admin123`: category route
  loaded from authenticated state, Enter-committed search produced the empty
  state, list and kanban rendered, CSS assets returned `text/css`, no failed
  requests were observed, and desktop/mobile page widths were 1440/1440 and
  390/390.
- Authenticated Odoo browser verification after restart produced no failed
  requests and page widths 1440/1440 and 390/390.

Screenshots remain outside Git:

- Odoo: `/tmp/odoo-expenses-owned/expense-categories-desktop.png`,
  `/tmp/odoo-expenses-owned/expense-categories-mobile.png`
- Core3: `/tmp/core3-expenses-next-20260910/expense-categories-desktop.png`,
  `/tmp/core3-expenses-next-20260910/expense-categories-mobile.png`

## Limitations

This batch does not add the Odoo category image, purchase-tax, sales-price,
or re-invoice-cost fields, nor delete semantics; it covers the existing Core3
category data model's create/edit/archive/restore boundary. The broader
Expenses detail duplicate-review, split-expense, posting wizard, attachments,
and chatter parity remains in the plan for later bounded batches.
