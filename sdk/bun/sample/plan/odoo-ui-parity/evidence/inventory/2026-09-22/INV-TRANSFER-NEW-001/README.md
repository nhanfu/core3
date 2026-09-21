# INV-TRANSFER-NEW-001 — New Transfer draft workflow

Date: 2026-09-22

This evidence records the source-backed New Transfer workflow selected after
the Inventory Late and Backorders queue slices. The Core3 implementation is a
YAML-first page/API pair joined by `page.id: transfer-new`, with durable Draft
creation and audit history.

Disposition: Core3 contract PASS; authenticated visual/Odoo form parity
PARTIAL/BLOCKED. No full Inventory sign-off is claimed.

Evidence files:

- `odoo-analysis.md` — local Odoo 19 action/form comparison and live result.
- `source-comparison.md` — source-to-Core3 mapping.
- `functionality-checklist.md` — bounded behavior and guards.
- `gap-matrix.md` — supported and blocked parity surfaces.
- `test-results.md` — focused test/build/check results.
- `verification.md` — browser/runtime evidence and exact blockers.
- `odoo-overview-desktop.png` — authenticated live Odoo overview capture.
