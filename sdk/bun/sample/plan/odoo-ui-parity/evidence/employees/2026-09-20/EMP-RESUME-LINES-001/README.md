# EMP-RESUME-LINES-001 evidence

Authenticated desktop/mobile evidence for employee Resume-tab resume-line CRUD.

- Core3: `admin@tms.local` at `127.0.0.1:3310`; company switch returned 200 to
  `Core3 Vietnam Branch`, but deterministic employee fixtures are in `Core3
  Vietnam`. The company guard hides the employee and Resume lines.
- Odoo: `codex@core3.local` against `core3_reference`; Abigail Peterson at
  `/odoo/employees/6`, Resume tab, desktop `1440x1000` and mobile `390x844`.
  Authentication and tab navigation pass, but no populated reference resume
  line values were rendered.

No visual parity sign-off is claimed. Seven Odoo app-icon 404s are shell noise;
page errors were empty.
