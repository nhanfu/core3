# Functionality checklist

| ID | Case | Expected result | Status |
| --- | --- | --- | --- |
| INV-FUNC-075 | Product action wiring | Product and Product Variant detail expose Lot/Serial Numbers only for tracked records and navigate to the shared Lots list with context. | pass |
| INV-DATA-075 | Template aggregation | Large Cabinet resolves two stable lots across two locations and the detail stat reports `lot_count: 2`. | pass |
| INV-DATA-076 | Variant filtering | Large Cabinet variant resolves the same two rows; an unrelated tracked product resolves an explicit empty result. | pass |
| INV-PERM-075 | Company boundary | Other-company context returns no rows and the action requires `inventory.tracking`; no write mutation is added. | pass |
| INV-FUNC-076 | Search/filter/error | Scoped search and On Hand filters work, while empty and transport-error fixtures return stable results. | pass |
| INV-DATA-077 | Migration/restart | Migration 0.0.92 is idempotent and both lots survive file-backed close/reopen. | pass |
| INV-UI-075 | Authenticated desktop/mobile | Compare live Odoo and Core3 at 1440x900 and 390x844. | blocked: shared Odoo tab already borrowed; no visual claim |
