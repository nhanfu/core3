# INV-PRODUCT-PUTAWAY-001

Bounded Inventory parity slice: the Odoo Product and Product Variant form
`Putaway Rules` stat action. Core3 reuses the existing Putaway Rules list and
applies the selected product/template context; it does not add a duplicate
renderer or navigation leaf.

Status: Core3 contract and persistence verified; authenticated desktop/mobile
comparison blocked by BrowserSkill tab-borrow confirmation timeout. No visual
parity claim is made.

Files:

- `source-comparison.md` — local Odoo 19 source and Core3 mapping.
- `functionality.md` — stable-ID behavior and guards.
- `test-results.md` — focused integration result.
- `browser-blocker.md` — exact shared-tab ownership blocker.
