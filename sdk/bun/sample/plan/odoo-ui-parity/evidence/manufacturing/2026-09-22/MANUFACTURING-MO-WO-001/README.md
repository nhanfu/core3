# MANUFACTURING-MO-WO-001 — Manufacturing Order Work Orders

Bounded parity evidence for Odoo 19
`action_mrp_workorder_production_specific`.

Core3 implements the record-scoped route
`/manufacturing-orders/detail/work-orders` with page/API separation, the
source five view modes, durable Manufacturing Order scoping, and the guarded
work-order workflow. Focused test and persistence evidence is recorded in
`test-results.md` and `api-database-assertions.md`.

The required live Odoo probe was blocked because the shared signed-in tab was
already owned by another BrowserSkill session. The desktop/mobile images in
this folder are blocker-state captures retained from the same shared profile;
they are not captures of the Work Orders action. No Odoo visual-parity claim is
made.
