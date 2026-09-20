# EMP-EMPLOYEE-SKILLS-001 evidence

Authenticated desktop/mobile evidence for employee current skill assignments.

- Core3: `admin@tms.local` at `127.0.0.1:3310`; `/api/v1/company/switch`
  returned 200 for `company-vietnam`, but `employee-demo-001` is seeded in
  `Core3 Vietnam` and the session is `Core3 Vietnam Branch`. The company guard
  therefore hides the fixture and the Skills grid cannot show populated rows.
- Odoo: `codex@core3.local` against `core3_reference`; Abigail Peterson at
  `/odoo/employees/6`, Work tab, desktop `1440x1000` and mobile `390x844`.
  Authentication and route access pass, but no populated Skills widget is
  rendered in this installed reference state.

No UI parity sign-off is claimed. Seven Odoo app-icon 404s are recorded as
shell noise; page errors were empty.
