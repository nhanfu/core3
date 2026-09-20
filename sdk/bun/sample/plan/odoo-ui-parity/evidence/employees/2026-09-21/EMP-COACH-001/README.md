# EMP-COACH-001 evidence

This slice covers Odoo `hr.employee.coach_id`: the source search view exposes
Coach as a company-scoped employee relation and the source list view includes
it as an optional column. Core3 implements the durable `coach_name` projection,
current-company filter, Work display, and guarded Edit Coach action.

Authenticated captures:

- `core3-desktop.png` and `core3-mobile.png`: Core3 at 1440x900 and 390x844.
- `odoo-desktop.png` and `odoo-mobile.png`: Odoo at 1440x900 and 390x844.

The Core3 session authenticated successfully but uses `Core3 Demo Company`,
while deterministic Employees fixtures are scoped to `Core3 Vietnam`; the
authenticated list therefore renders an empty state. Odoo authenticated
successfully and renders 24 employees. Its default kanban/list projection does
not show Coach because the source column is optional and hidden by default;
the source mapping and this blocker are recorded in `source-comparison.md`.

This is conditional feature evidence and does not claim aggregate Employees
sign-off.
