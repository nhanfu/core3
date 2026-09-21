# Verification and blockers

BrowserSkill instance `245ea108` was authenticated and the borrowed Odoo tab
was returned to its original CRM route. `http://localhost:8069/odoo/fleet`
resolved to the Discuss/OdooBot shell with no Fleet application/menu in
`core3_reference`.

Blocker captures, deliberately not committed, are:

- Desktop 1916x833: `/tmp/core3-odoo-parity/fleet-vehicle-tags-20260922/odoo-desktop-fleet-unavailable.png` (SHA-256 `c3f5499ea1f8de97922356c1c51736ee144420ee030f14ab63c16da7e8c09ade`).
- Mobile 390x844: `/tmp/core3-odoo-parity/fleet-vehicle-tags-20260922/odoo-mobile-fleet-unavailable.png` (SHA-256 `e07c4ba5f1db3b7fd474618cefb5e7cbe27302c0da5fccf4399f92fc3ebc9d65`).

No Odoo or Core3 visual parity claim is made. Core3 authenticated browser
verification was not executable after the requested reference check because
no authenticated Core3 runtime/tab was available in this turn. YAML,
database, permission, guard, reload, and migration evidence remains valid.
