# EMP-EMPLOYEE-HR-PRESENCE-001 evidence

The source contract is Odoo `hr.employee.hr_presence_state` and the
`hr_icon_display` presence widget from `addons/hr/models/hr_employee.py` and
`addons/hr/views/hr_employee_views.xml`. Core3 keeps the API and page YAML
contracts separate and joins them with `page.id: employee-detail` (and
`page.id: employees` for the list projection).

Authenticated Core3 desktop/mobile captures and request summaries are stored
beside this file. The focused integration test covers the durable migration,
read projection, refresh action, actor/company/missing/stale guards, replay,
and file-backed restart.

Core3 authentication succeeded at the Employee detail route for both 1440x1000
desktop and 390x844 mobile contexts. Both sessions had zero failed requests,
zero console errors, and no horizontal overflow. The deterministic employee is
owned by `Core3 Vietnam`, while the authenticated session is scoped to
`Core3 Demo Company`, so the detail projection and the HR Presence controls are
not rendered; this is a fixture/company alignment blocker, not a test failure.

Odoo comparison attempts at `/web/login` are captured in `odoo-desktop.json`
and `odoo-mobile.json`. Desktop rejected `admin/admin` with `Wrong
login/password`; the mobile retry was rejected with `Too many login failures,
please wait a bit before trying again.` No authenticated Odoo comparison is
claimed.

Odoo desktop/mobile comparison is attempted separately. No aggregate Employees
sign-off is claimed from this bounded slice.
