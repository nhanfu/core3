# EMP-EMERGENCY-CONTACT-001 evidence

The slice maps Odoo HR-user Personal-tab Emergency Contact fields to Core3
employee detail/create/edit contracts.

- Odoo: authenticated `codex@core3.local` on `core3_reference`, Abigail
  Peterson detail, Personal tab, desktop `1440x1000` and mobile `390x844`.
  `odoo-browser.json` records the visible group, zero page errors, and
  viewport-matched widths. Seven known app-icon 404s are recorded separately
  as reference shell noise.
- Core3: authenticated `admin@tms.local` on `127.0.0.1:3310`, desktop
  `1440x900` and mobile `390x844`. The browser captured the exact page failure:
  `/api/pages/employee-detail` returned HTTP 500 because shared discovery
  rejected an unrelated `components[0].row_action`. The duplicate response
  from the deterministic browser setup also confirms the employee-number
  guard. No other module's file was changed to bypass this blocker.

These artifacts do not claim Core3 visual sign-off; Odoo comparison is the
available authenticated reference evidence.
