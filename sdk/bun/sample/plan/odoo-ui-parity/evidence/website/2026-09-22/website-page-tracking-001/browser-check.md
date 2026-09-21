# Browser evidence and blockers

Browser instance: `245ea108`.

Core3 was run with the isolated Website runner on `http://localhost:4320`.
Authenticated Admin User rendered `/website/website-pages` with the Tracking
and SEO filter group plus three seeded rows at desktop and mobile. Captures:

- `/tmp/core3-odoo-parity/website-page-tracking/core3-desktop.png`
- `/tmp/core3-odoo-parity/website-page-tracking/core3-mobile.png`

The authenticated Odoo reference at `http://localhost:8069` was inspected at
desktop and with iPhone emulation. The launcher exposed Discuss through
Expenses/Apps but no Website application, and `/odoo/website-pages` redirected
to Discuss. Diagnostic captures:

- `/tmp/core3-odoo-parity/website-page-tracking/odoo-no-website-desktop.png`
- `/tmp/core3-odoo-parity/website-page-tracking/odoo-no-website-mobile.png`

Blocker: the shared authenticated Odoo actor is not a Website user, so no Odoo
Page Manager desktop/mobile capture or paired visual comparison is claimed.
The Core3 isolated runtime was healthy; this slice did not modify unrelated
startup/module issues.
