# `TIMESHEET-EMPLOYEE-CONTEXT-DEFAULT-001` desktop/mobile evidence

Date: 2026-09-21

Expected Core3 route: `/employee-timesheets?employee_id=employee-demo-002`

The bounded runtime probe was truthful but could not reach an authenticated
Core3 browser surface:

- `http://127.0.0.1:3001/api/modules` — connection refused.
- `http://127.0.0.1:3001/employee-timesheets?employee_id=employee-demo-002` — connection refused.
- `http://127.0.0.1:8069/web/login` — HTTP 200 login page only.
- `http://127.0.0.1:8073/web/login` — HTTP 200 login page only.

Therefore no authenticated desktop or 390x844 mobile screenshot is claimed,
and no visual sign-off is recorded. The focused and full service tests provide
the non-browser evidence for the page/API contract, durable employee-context
default, guards, and restart behavior.
