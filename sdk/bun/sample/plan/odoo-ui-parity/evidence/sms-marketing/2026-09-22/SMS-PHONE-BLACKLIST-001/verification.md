# Verification

## Odoo reference

Browser-skill work used browser instance `245ea108` against
`http://localhost:8069` with the existing authenticated QA profile. The Apps
catalog showed an installable “SMS Marketing” entry, while the authenticated
application menu contained no SMS Marketing module. The reference database
could not open `mass_mailing_sms_menu_configuration` or `phone_blacklist_menu`.

This is an exact installation blocker, not a visual comparison. No Odoo
desktop/mobile parity claim is made.

## Core3

The focused repository test and UI audit passed. The final runtime probe found
no listeners on ports 3001, 3002, or 4330 and each `/api/modules` readiness
request returned HTTP `000`; therefore no authenticated Core3 desktop/mobile
capture was possible in this run. No Core3 visual-parity claim is made.

The bsk session was stopped after browser work; `bsk session list --json`
returned an empty session list at handoff.
