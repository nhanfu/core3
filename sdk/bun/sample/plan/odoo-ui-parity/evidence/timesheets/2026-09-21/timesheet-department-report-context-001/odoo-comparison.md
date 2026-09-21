# Odoo source comparison and blocker

The focused source comparison covers:

- `hr_timesheet/views/hr_department_views.xml`: the Department Kanban
  Timesheets action targets `act_hr_timesheet_report` and passes
  `search_default_department_id` plus `default_department_id`.
- `hr_timesheet/report/hr_timesheet_report_view.xml`: the action is the
  `timesheets-by-employee` report with the project-present domain.

Core3 implements the corresponding manager-scoped Department filter on the
existing `timesheets-by-employee` page/API pair. It reads durable employee
department relations, scopes both options and report rows to the active
company, and fails closed for missing or empty context.

Authenticated route/action comparison was blocked because both configured Odoo
instances served `/web/login` without an authenticated session:

```text
127.0.0.1:8069/web/login -> HTTP 200
127.0.0.1:8073/web/login -> HTTP 200
```

The repository UI audit was also blocked by an unrelated shared eCommerce page
schema error: `actions[1].fields is not allowed`. No eCommerce path was edited
or staged. Existing Odoo Print/PDF/action surfaces remain separate blockers;
no module sign-off is claimed.
