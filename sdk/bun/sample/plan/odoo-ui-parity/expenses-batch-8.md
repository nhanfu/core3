# Expenses batch 8 - activity scheduling and completion

Status: implemented; browser evidence conditional
Date: 2026-09-22
Feature ID: EXPENSE-FUNC-011

## Odoo source comparison

- `/home/nhanjs/projects/odoo/addons/hr_expense/models/hr_expense.py:43-48`
  declares `hr.expense` with `mail.activity.mixin`.
- `/home/nhanjs/projects/odoo/addons/hr_expense/views/hr_expense_views.xml:25`
  exposes `activity_ids` with `list_activity` in the expense list.
- `/home/nhanjs/projects/odoo/addons/hr_expense/views/hr_expense_views.xml:467-487`
  declares the `hr.expense` Activity view and its employee/amount card.
- `/home/nhanjs/projects/odoo/addons/hr_expense/views/hr_expense_views.xml:489-504`
  includes `activity` in the My Expenses action view order.
- `/home/nhanjs/projects/odoo/addons/hr_expense/data/mail_activity_type_data.xml`
  defines the Expense Approval activity type.

The live authenticated reference is `http://localhost:8069`, database
`core3_reference`, accessed through browser instance `245ea108`. No
credentials, cookies, or tokens are read or recorded.

## Core3 gap and bounded contract

Before this batch, `expense_detail_activity` was immutable workflow/email
history. There was no planned activity table, deadline/assignee fields, or
completion action. This batch changes only Expenses paths:

- `pages/expense-detail.yaml` declares `activity_action` and
  `activity_complete_action`; it remains layout-only.
- `api/expense-detail.yaml` joins scheduled activity rows into the existing
  chatter source and declares the schedule/complete mutations.
- `20260922100000-013-expense-activities.yaml` adds the idempotent durable table
  and one stable planned fixture.
- `expenses_activities.integration.test.ts` verifies contract, persistence,
  guards, audit, restart, and replay.

Schedule accepts To-Do, Call, Meeting, or Email; a summary; an ISO deadline;
optional assignee and note. It requires `expenses.write`, a signed-in actor,
the current company, and the current expense row version. Completion requires
the planned state and activity row version, then writes a Done state and one
completion audit row. No Temporal workflow is needed: this is a module-local
synchronous transition, not a timer or third-party side effect.

## Verification

- Focused: `bun test test/expenses_activities.integration.test.ts --timeout
  20000` — 4 passed, 23 assertions.
- Contract gates: `bun run audit` — passed, 782 pages / 791 routes / 1,606
  datasources; `bun run css:build:expenses` — passed; `git diff --check` —
  passed.
- Full Expenses corpus and browser evidence are recorded in `test-results.md`
  and `verification.md` in the feature folder.
