# Verification and blocker

BrowserSkill used connected Chrome instance `245ea108`. Session `lvan`
borrowed authenticated user tab `1770663883`, navigated to
`http://localhost:8069/odoo/time-off?db=core3_reference`, and observed the
desktop and emulated iPhone-14 mobile states. Both states exposed Discuss, not
the Time Off application; no `hr_leave_action_my_request` modal was available.

Blocker captures:

- Desktop: `/tmp/core3-odoo-parity/timeoff-dashboard-request-modal-odoo-discuss-desktop.png`
- Mobile: `/tmp/core3-odoo-parity/timeoff-dashboard-request-modal-odoo-discuss-mobile.png`

Mobile emulation was cleared, tab `1770663883` was explicitly returned, and
the BrowserSkill session was stopped; `bsk session list --json` returned no
sessions. No independent login, credential/token inspection, Odoo mutation, or
Playwright session was used. Odoo desktop/mobile visual parity remains
unverified because the supplied authenticated database lacks `hr_holidays`.
