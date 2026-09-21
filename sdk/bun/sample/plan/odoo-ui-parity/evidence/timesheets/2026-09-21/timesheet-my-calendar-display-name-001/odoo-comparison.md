# Odoo source comparison and blocker

The focused source comparison covers:

- `hr_timesheet/models/hr_timesheet.py` `_compute_calendar_display_name`,
  including hours/minutes and day encoding.
- `hr_timesheet/views/hr_timesheet_views.xml` `create_name_field="calendar_display_name"`
  on the calendar view.

Authenticated route comparison was blocked on 2026-09-21. Both configured
Odoo endpoints redirected `/odoo/timesheets` to `/web/login`:

```text
127.0.0.1:8069 -> /web/login?redirect=%2Fodoo%2Ftimesheets%3F
127.0.0.1:8073 -> /web/login?redirect=%2Fodoo%2Ftimesheets%3F
```

No authenticated Odoo desktop/mobile comparison or sign-off is claimed.
Existing Odoo Print/PDF/action surfaces remain separate blockers.
