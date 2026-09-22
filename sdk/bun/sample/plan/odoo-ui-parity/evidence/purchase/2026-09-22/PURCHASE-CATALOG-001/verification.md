# Verification — `PURCHASE-CATALOG-001`

Repository-backed verification passed without changing unrelated dirty work. A
fresh migration creates `purchase_order_lines.product_id`; rerunning it is
idempotent. On `po-demo-001`, selecting Acoustic Bloc Screens and Apple Pie at
quantity 2 created two durable lines and recalculated the order to quantity 414
and total 999. Re-selecting Acoustic Bloc Screens at quantity 1 merged into
the existing line (quantity 3, line total 540) and recalculated the order to
quantity 415 and total 1179. A stale parent version, confirmed order, missing
product, and empty selection were rejected without a partial write.

Browser verification status: **blocked**. BrowserSkill instance `245ea108`
was connected, but the signed-in Odoo tab could not be borrowed: it was first
owned by session `lexx`, then a new borrow confirmation remained pending until
timeout. The owned BrowserSkill session was stopped. No browser capture or
visual-parity assertion is included.
