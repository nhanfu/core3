# `TIMESHEET-PROJECT-CONTEXT-DEFAULT-001` desktop/mobile evidence

Date: 2026-09-21

Expected Core3 route: `/project-timesheets?project_id=project-demo-001`

The bounded runtime probe could not reach an authenticated Core3 browser
surface:

- `http://127.0.0.1:3001/api/modules` — connection refused.
- `http://127.0.0.1:3001/project-timesheets?project_id=project-demo-001` — connection refused.
- `http://127.0.0.1:8069/web/login` — HTTP 200 login page only.
- `http://127.0.0.1:8073/web/login` — HTTP 200 login page only.

No authenticated desktop or 390x844 mobile screenshot is claimed, and no
visual sign-off is recorded. The focused service evidence covers the paired
page/API contract, durable project-context default, company/permission guards,
and restart behavior.
