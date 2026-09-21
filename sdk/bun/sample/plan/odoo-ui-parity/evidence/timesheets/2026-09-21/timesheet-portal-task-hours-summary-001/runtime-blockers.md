# Timesheets Wave 46 runtime blockers

Playwright CLI reached both routes on 2026-09-21, but authenticated evidence
was unavailable:

```text
Core3 navigation:
  requested: http://127.0.0.1:3001/my/projects/task/timesheets
  final:     http://127.0.0.1:3001/auth/login?redirect=%2Fmy%2Fprojects%2Ftask%2Ftimesheets
  title:     TMS — Transport Management System
  console:   0 errors, 1 warning

Odoo navigation:
  requested: http://127.0.0.1:8069/odoo/all-tasks/100
  final:     http://127.0.0.1:8069/web/login?redirect=%2Fodoo%2Fall-tasks%2F100%3F
  title:     Odoo
```

No credentials were available to cross either login boundary, so no
authenticated Core3 desktop/mobile or paired Odoo capture was fabricated.
Odoo Print/PDF/action surfaces remain explicit parity blockers; this slice has
no visual or module sign-off.
