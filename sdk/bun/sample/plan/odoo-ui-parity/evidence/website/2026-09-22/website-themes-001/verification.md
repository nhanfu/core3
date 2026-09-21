# Browser verification and blockers

Browser instance: `245ea108`. Odoo service: `http://localhost:8069`, database:
`core3_reference`.

Odoo desktop capture: `odoo-no-website-desktop.png` (1916x833).
Odoo mobile capture: `odoo-no-website-mobile.png` (390x844).

Both authenticated observations showed Discuss/OdooBot only. The launcher had
no Website application and no Theme Manager action; the shared actor is not a
Website-enabled Odoo user. This blocks Odoo Theme Manager interaction and any
paired visual claim. No credentials, cookies, or tokens were extracted.

Core3 isolated Website runner: `http://localhost:4330`.
Core3 desktop capture: `core3-desktop.png` (1916x833). The route loaded as the
authenticated Core3 shell, but the browser session was closed before a fresh
Theme Manager mobile capture could be completed. The incorrectly named first
attempt was renamed to the valid desktop artifact; no Core3 mobile image is
claimed.

Final visual status: blocked for paired Odoo comparison and Core3 mobile
coverage. Functional/API/persistence evidence remains valid from the focused
tests.
