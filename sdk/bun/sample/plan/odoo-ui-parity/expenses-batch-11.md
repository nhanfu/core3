# Expenses batch 11 - Employee Expenses action analytics

Status: bounded implementation complete; authenticated browser evidence blocked
Date: 2026-09-22
Feature ID: EXPENSE-FUNC-014

## Source-backed scope

Odoo's `action_hr_expense_account` in
`/home/nhanjs/projects/odoo/addons/hr_expense/views/hr_expense_views.xml:585-605`
defines the Employee Expenses action at `expenses-employee` with
`list,kanban,form,pivot,graph` modes, the approved/to-pay default context, and
the create-expense empty-state copy. The shared expense list source at lines
3-65 exposes employee, category, payment mode, activity, taxes, total, and
state columns. Core3 already had the route and list/kanban read surface, but
did not expose the action's analytics modes, default scope, status/payment
filters, or explicit datasource error state.

## Bounded implementation

- `pages/employee-expenses.yaml` now declares the Odoo view order, shared
  Graph/Pivot configuration, group-by choices, and approved/to-pay default
  scope. The existing detail navigation remains the form behavior.
- `api/employee-expenses.yaml` remains joined by `page.id:
  expenses-employee`, adds service-owned status/payment lookups, applies the
  approved-or-employee-paid-posted scope, supports status/payment filters, and
  exposes total/tax/payment labels plus `EXPENSE_EMPLOYEE_UNAVAILABLE`.
- No migration or schema change is needed; the action reads existing durable
  expense rows and preserves company/permission enforcement through
  `expenses.read`.

## Verification boundary

The focused integration test covers page/API separation, exact Odoo view order,
pivot measures, default scope, status/payment filtering, stable rows, empty
search, and transport error. BrowserSkill daemon instance `245ea108` was
connected, but borrowing the existing signed-in Odoo tab did not transfer it
into the agent window; the agent window remained `about:blank`. The session was
stopped. No live desktop/mobile visual-parity claim is made for this batch.
