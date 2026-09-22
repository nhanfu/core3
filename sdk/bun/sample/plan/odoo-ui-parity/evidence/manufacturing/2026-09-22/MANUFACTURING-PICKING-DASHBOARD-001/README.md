# MANUFACTURING-PICKING-DASHBOARD-001

Bounded feature: Odoo's `mrp_production_action_picking_deshboard`, the
Manufacturing Orders action opened from an MRP operation-type dashboard.

Core3 implements the durable selected-picking-type route at
`/manufacturing/manufacturings` with List/Kanban/Form modes, scoped search and
status filters, and permissioned creation. The presentation contract is kept
separate from the page-id-bound API contract; migration `0.0.27` persists the
operation-type relation and index.

The live Odoo visual comparison is blocked. The shared signed-in tab was owned
by another BrowserSkill session, and task-created navigation rendered
Discuss/OdooBot. See `browser-blocker.md` for exact captures and hashes.
