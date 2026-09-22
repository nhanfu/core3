# Functionality checklist

| ID | Case | Expected result | Status |
| --- | --- | --- | --- |
| INV-FUNC-074 | Product form Stock Moves action | Product detail shows the Stock Moves stat and navigates to the existing Moves History route with the stable template context. | pass |
| INV-DATA-074 | Variant aggregation | Storage Box resolves two deterministic Done move lines across its product-template relation. | pass |
| INV-PERM-074 | Read permission | The stat and Moves History datasource require `inventory.read`; no write mutation is exposed. | pass |
| INV-FUNC-075 | Search/status/empty filters | Product-scoped rows retain Moves History search/status behavior and return an explicit empty result for empty fixtures. | pass |
| INV-DATA-075 | Migration/restart | Relation rows replay idempotently and survive a file-backed close/reopen. | pass |
| INV-UI-074 | Authenticated desktop/mobile | Compare the Product stat and scoped report at 1440x900 and 390x844 against live Odoo. | blocked: BrowserSkill borrow timeout |
