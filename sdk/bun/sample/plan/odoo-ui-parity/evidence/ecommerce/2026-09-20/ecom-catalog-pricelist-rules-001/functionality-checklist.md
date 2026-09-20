# Functionality checklist

| Gate | Evidence | Result |
| --- | --- | --- |
| Source/menu/action/model | `source-comparison.md`, Odoo paths above | pass |
| Page/API separation | page and API both join on `ecommerce-pricelist-detail`; focused schema test | pass |
| Durable schema/demo | migrations 046/047 and isolated DuckDB rerun/restart test | pass |
| Read/list/detail | seeded rule appears in authenticated Core3 detail capture | pass |
| Create/update/delete | focused mutation test covers successful CRUD; browser company boundary is captured | pass |
| Validation | invalid target, date window, values, duplicate, and non-negative rules | pass |
| Permission/company | `ecommerce.write` actions plus cross-company 403 guard | pass |
| Concurrency | stale `row_version` update/delete rejection | pass |
| Restart/cart workflow | rule survives reopen and percentage price is applied to cart | pass |
| Desktop/mobile | Core3 1440x900 and 390x844 captures | pass |
| Odoo comparison | `/shop` exact 404 captures on 8069 and 8073 | blocked |

Exploratory states checked: seeded list, rule form, company rejection toast,
mobile detail, empty/transport error declarations in the API contract, and
the Odoo 404 blocker. No sign-off is claimed for the missing Website/eCommerce
reference or true product-variant pricing.
