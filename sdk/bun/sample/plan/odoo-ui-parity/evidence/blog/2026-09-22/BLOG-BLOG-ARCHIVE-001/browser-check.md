# BLOG-BLOG-ARCHIVE-001 browser evidence and blockers

Browser skill session used browser instance `245ea108`; the owned session was
stopped cleanly after the captures. The authenticated Odoo database was
`core3_reference` at `http://localhost:8069`.

## Odoo reference

- The authenticated app launcher observed on `/odoo` contained Discuss,
  Calendar, Contacts, CRM, Sales, and other installed apps, but no Website or
  Blog entry.
- Desktop navigation to `http://localhost:8069/blog` returned Odoo Error 404.
  Capture: `/tmp/core3-odoo-parity/blog/2026-09-22/odoo-blog-404-desktop.png`
  (1916x833).
- Mobile emulation reported a 390x844 viewport and the same authenticated
  `/blog` navigation returned Odoo Error 404. Capture:
  `/tmp/core3-odoo-parity/blog/2026-09-22/odoo-blog-404-mobile.png`.
  The screenshot service reported the Agent Window surface as 1916x833 even
  though the observed emulated viewport was 390x844; this is retained as a
  blocker capture, not a mobile visual-parity claim.

## Core3

Navigation to `http://localhost:3001/blog` was rejected by the browser with
`net::ERR_CONNECTION_REFUSED`. No authenticated Core3 screenshot or paired
visual-parity claim was made.
