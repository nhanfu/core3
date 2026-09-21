# Odoo analysis

- Revision: `659759969d535d286b656c96b675e4612b925ddd` (`65975996`).
- `models/fleet_vehicle.py` declares `tag_ids = fields.Many2many('fleet.vehicle.tag', ...)`.
- `views/fleet_vehicle_views.xml` renders `tag_ids` with `many2many_tags` in the vehicle form title, list, quick-create, and kanban views.
- `models/fleet_vehicle_tag.py` defines required tag name and Odoo color index.
- `security/ir.model.access.csv` grants Fleet users read-only tag access and Fleet managers full CRUD; vehicle writes remain available under the source vehicle access row.
- Demo vehicles receive tag sets through `data/fleet_demo.xml`.

The requested live reference at `http://localhost:8069`, database
`core3_reference`, was authenticated in BrowserSkill instance `245ea108`, but
direct `/odoo/fleet` navigation resolved to Discuss/OdooBot with no Fleet menu.
