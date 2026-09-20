# INV-STOCK-AT-DATE-001 — Stock report Inventory at Date

Bounded Inventory parity slice for the Odoo Stock report’s Inventory at Date
wizard. The Core3 page remains presentation-only and joins its service-owned API
through `page.id: stock-report`.

Evidence map:

- [`odoo-analysis.md`](odoo-analysis.md): source menu/action/wizard analysis.
- [`source-comparison.md`](source-comparison.md): Odoo-to-Core3 mapping.
- [`functionality-checklist.md`](functionality-checklist.md): lifecycle cases.
- [`gap-matrix.md`](gap-matrix.md): closed behavior and residual boundary.
- [`test-results.md`](test-results.md): focused and static checks.
- [`verification.md`](verification.md): authenticated desktop/mobile results.
- `core3-stock-report-*.png`, `core3.json`: fresh Core3 form/context/reload evidence.
- `odoo-stock-report-*.png`, `odoo.json`: fresh paired Odoo report/wizard evidence.

Credentials are omitted from committed artifacts. No Odoo mutation was made.
