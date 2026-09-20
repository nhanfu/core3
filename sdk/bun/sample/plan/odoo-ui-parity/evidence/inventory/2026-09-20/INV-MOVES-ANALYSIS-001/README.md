# `INV-MOVES-ANALYSIS-001` — Moves Analysis

This package covers the bounded Odoo `stock.move` report slice. It is not full
Inventory sign-off.

- Source/menu/action: [`odoo-analysis.md`](odoo-analysis.md)
- Core3 comparison and residuals: [`source-comparison.md`](source-comparison.md)
  and [`gap-matrix.md`](gap-matrix.md)
- Functional checklist: [`functionality-checklist.md`](functionality-checklist.md)
- Test and browser verification: [`test-results.md`](test-results.md) and
  [`verification.md`](verification.md)
- Authenticated Core3 captures: [`core3/`](core3/)
- Authenticated Odoo captures: [`odoo/`](odoo/)

The report is intentionally read-only, matching Odoo's `create="0"` and
`edit="0"` form/list contract. No Odoo mutation was performed.
