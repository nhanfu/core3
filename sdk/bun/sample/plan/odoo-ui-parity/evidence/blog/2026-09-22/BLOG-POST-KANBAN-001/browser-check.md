# BLOG-POST-KANBAN-001 browser evidence and blockers

BrowserSkill used browser instance `245ea108` with authenticated Odoo access at
`http://localhost:8069`, database `core3_reference`. No credentials, cookies,
or tokens were extracted. The owned BrowserSkill sessions were stopped.

## Odoo reference

- The authenticated `/odoo` launcher had no Website or Blog application/menu.
- Desktop navigation to `http://localhost:8069/blog` returned Odoo Error 404.
  Capture: `odoo-desktop-404.png` (1916x833).
- Mobile emulation reported 390x844 and the same authenticated `/blog` route
  returned Odoo Error 404. Capture: `odoo-mobile-404.png` (390x844).

Captures are stored beside this file in this evidence directory. Because the
module is absent from `core3_reference`, these are blocker captures only and
not Odoo Blog visual-parity evidence.

## Core3

Navigation to `http://localhost:3001/blog` returned browser
`net::ERR_CONNECTION_REFUSED`; the Core3 API/server was not available for an
authenticated paired capture. No Core3 screenshot or visual-parity claim was
made.
