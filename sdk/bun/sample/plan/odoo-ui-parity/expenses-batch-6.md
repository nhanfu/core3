# Expenses parity batch 6: department Expense to Approve

Status: implemented; source/runtime visual reference unavailable for the primary Odoo database.

## Source-backed scope

The next unimplemented `hr_expense` action was `action_hr_expense_department_to_approve` in `/home/nhanjs/projects/odoo/addons/hr_expense/views/hr_expense_views.xml`. Odoo defines the title `Expense to Approve`, path `expense-to-approve`, view order `list,kanban,form,pivot,graph`, the submitted-state search-panel default, and the active department domain. The action uses the shared expense list/search view; approval/refusal controls remain permission- and state-dependent.

Core3 adds `/expenses/to-approve` under Expenses → My Expenses. Because Core3 has no department-detail `active_id` context on this entry point, the service contract makes the selected department explicit and deterministically defaults it to `Sales`, while exposing the submitted department lookup for switching scope. The slice presents list, kanban, and pivot views through shared `ListView`; opening a row uses the existing expense detail page.

## Implementation and boundaries

- Added presentation-only `pages/to-approve.yaml` and page-ID-joined `api/to-approve.yaml`.
- The datasource returns only `Submitted` expenses in the selected department, ordered by expense date ascending then stable ID, with search, payment-mode filtering, empty state, and transport-error metadata.
- Approve requires `expenses.manage` and a receipt; Refuse requires `expenses.manage`, a reason, and a submitted state. Both record stable activity metadata and refresh the scoped queue.
- The separate department-scoped `action_hr_expense_department_filtered` graph/pivot analysis action remains deferred; it is not silently mapped to this approval queue.

## Verification

- `bun test test/expenses_department_approval.integration.test.ts`: page/API separation, Odoo view order, Sales/Engineering scoping, stable ordering, empty/error states, navigation, permission, and receipt guard.
- No live visual parity claim is made. The primary `core3_demo` Odoo database has `hr_expense` uninstalled, so its department action/menu is not registered. No fabricated capture was added; screenshots remain outside Git.
