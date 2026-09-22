# MANUFACTURING-MO-SCRAPS-001

Bounded feature: the Manufacturing Order `Scraps` stat action from
`mrp.production.action_see_move_scrap`.

The source action calls `stock.action_stock_scrap`, applies the domain
`production_id = active_id`, and exposes `list,form,kanban,pivot,graph`.
Core3 implements the durable scope at
`/manufacturing-orders/detail/scraps`, joined to the MO detail through the
`open_mrp_production_scraps` stat action. The global Scrap Orders contract is
retained and now stores the durable `production_id` relation used by both
surfaces.

No Odoo visual-parity claim is made. BrowserSkill could not borrow the shared
authenticated tab, and the task-created Odoo route redirected to Discuss.
See `browser-blocker.md` for the exact blocker and desktop/mobile captures.
