# Functionality checklist

| Check | Result | Evidence |
| --- | --- | --- |
| Stable ID and Odoo action/model trace | pass | Focused test and `odoo-analysis.md` |
| Separate page/API YAML joined by `page.id` | pass | `ecommerce-delivery-zip-prefixes` in both contracts |
| Technical menu/page/datasource/action permission | pass | `ecommerce.technical` declarations and focused test |
| Durable schema and deterministic fixtures | pass | migrations `0.0.169` and `0.0.170` |
| List/search and Odoo list/form labels | pass | `Prefix` column/field and search contract |
| Empty and transport-error states | pass | focused test |
| Create uppercase normalization | pass | focused test (`12ab` → `12AB`) |
| Edit uppercase normalization and row version | pass | focused test (`34cd$` → `34CD$`, version 2) |
| Blank/duplicate/missing/stale guards | pass | focused test and API guards |
| Delete and DuckDB restart persistence | pass | focused test |
| Authenticated Odoo desktop comparison | blocked | Borrow denied; see `browser-check.md` |
| Authenticated Odoo mobile comparison | blocked | Borrow denied; see `browser-check.md` |
