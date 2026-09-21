# BLOG-POST-ARCHIVE-001 browser evidence and blockers

Browser skill session: requested browser instance `245ea108`; the owned
session was stopped cleanly after capture.

## Odoo reference

- Desktop capture: `/tmp/core3-odoo-parity/blog/2026-09-21/odoo-blog-404-desktop.png`
  at 1916x833. The authenticated profile returned Odoo Error 404 for
  `http://localhost:8069/blog`.
- Mobile capture: `/tmp/core3-odoo-parity/blog/2026-09-21/odoo-blog-404-mobile.png`
  at 390x844. The same route returned Odoo Error 404.
- The app launcher observed on `/odoo` contained no Website or Blog entry.

## Core3

Navigation to `http://localhost:3001/blog-posts` was rejected with
`net::ERR_CONNECTION_REFUSED`; only the unrelated Vite listener on `:3002`
was present. No authenticated Core3 screenshot or visual-parity claim was
made.
