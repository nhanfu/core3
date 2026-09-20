# `INV-PHYSICAL-001` — Physical Inventory Apply All

This evidence package covers the bounded Physical Inventory adjustment slice.
It is not full Inventory sign-off.

- Odoo source/menu/action comparison: [`odoo-analysis.md`](odoo-analysis.md)
  and [`source-comparison.md`](source-comparison.md)
- Functionality and residual gap record: [`functionality-checklist.md`](functionality-checklist.md)
  and [`gap-matrix.md`](gap-matrix.md)
- Verification record: [`test-results.md`](test-results.md) and [`verification.md`](verification.md)
- Authenticated Core3 captures: [`core3/`](core3/)
- Authenticated Odoo comparison captures: [`odoo/`](odoo/)

Core3's final workflow used `[E-COM08] Storage Box`, with 18 on hand and 20
counted before Apply All; reason `January cycle count` and counting date
`2026-01-15` were persisted. Odoo was inspected but not mutated.
