# Wave 35 desktop/mobile evidence

Feature: `TIMESHEET-PROJECT-ACTION-MULTI-SCOPE-001`

The required authenticated Core3 desktop (1440x900) and mobile (390x844)
browser captures could not be produced in this run. A bounded readiness probe
found no listener on `127.0.0.1:3001`:

- `GET http://127.0.0.1:3001/api/modules` — curl error 7, connection refused.
- `GET http://127.0.0.1:3001/project-timesheets?project_ids=project-demo-001%2Cproject-demo-002` — curl error 7, connection refused.
- Playwright interactive `js_repl` is not exposed in this session, so no
  substitute authenticated browser capture was fabricated.

The API/YAML and restart gates are covered by the focused integration suite;
this file records a browser blocker, not visual sign-off.
