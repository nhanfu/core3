# Blockers

The local Odoo probe at `http://127.0.0.1:8069/web` returned HTTP 303 to
`/web/login?redirect=%2Fweb%3F`. No authenticated Odoo session or credentials
were available, so paired Odoo desktop/mobile screenshots and live CRUD are
blocked. The exact response is captured in `odoo-blocker.json`; source/menu
comparison remains available in `source-comparison.md`. No Odoo mutation was
attempted.

Core3 authenticated desktop/mobile evidence is complete. Full Inventory
sign-off remains open.
