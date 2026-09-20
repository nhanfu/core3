# INV-SETTINGS-001 — Annual Inventory Day and Month

Bounded Inventory parity slice completed for the Odoo Inventory Settings
control. The page/API contracts remain separate and join through
`page.id: inventory-settings`.

Evidence map:

- [`odoo-analysis.md`](odoo-analysis.md): source menu/action and model semantics.
- [`source-comparison.md`](source-comparison.md): Odoo-to-Core3 contract mapping.
- [`functionality-checklist.md`](functionality-checklist.md): lifecycle cases.
- [`test-results.md`](test-results.md): focused test and repository checks.
- [`verification.md`](verification.md): authenticated desktop/mobile results.
- [`gap-matrix.md`](gap-matrix.md): closed slice and residual boundaries.
- `core3-desktop-*.png`, `core3-mobile-*.png`: authenticated Core3 states.
- `core3-desktop.json`, `core3-mobile.json`: captured request, persistence, and viewport facts.
- `odoo-settings-desktop.png`, `odoo-settings-mobile.png`, `odoo.json`: authenticated Odoo comparison/blocker capture.

Credentials are intentionally omitted from committed evidence. Odoo reference
rendering is recorded as an exact blocker where the supplied action fails.
