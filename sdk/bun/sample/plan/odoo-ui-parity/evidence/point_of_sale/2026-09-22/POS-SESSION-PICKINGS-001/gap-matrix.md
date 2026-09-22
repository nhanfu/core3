# Gap matrix

| Stable ID | Gap | Scope decision | Evidence |
| --- | --- | --- | --- |
| POS-SESSION-PICKINGS-001 | Odoo session forms expose a Pickings stat action; Core3 had only order-level picking navigation | Add a read-only session-scoped Ready picking list and stat action. Reuse `pos_order_pickings` and Inventory transfer detail; do not add picking CRUD or duplicate transfer forms. | focused integration test; audit/build gates; verification blocker |
