# Odoo comparison and blocker

The source comparison is covered by the focused test against the supplied
`hr_timesheet` checkout:

- `hr_timesheet/models/hr_timesheet.py`: `_onchange_project_id` clears a task
  whose project no longer matches the selected project.
- `hr_timesheet/views/hr_timesheet_views.xml`: the timesheet form supplies
  `default_project_id`, `search_default_my_tasks`, and
  `search_default_open_tasks` in the task context.

Authenticated Odoo route evidence is blocked on both configured endpoints. On
2026-09-21 each returned `303 See Other` for
`/odoo/timesheets`, redirecting to `/web/login`:

```text
127.0.0.1:8069 -> /web/login?redirect=%2Fodoo%2Ftimesheets%3F
127.0.0.1:8073 -> /web/login?redirect=%2Fodoo%2Ftimesheets%3F
```

No authenticated Odoo desktop/mobile comparison or sign-off is claimed.
Existing Odoo Print/PDF/action surfaces remain separate parity blockers.
