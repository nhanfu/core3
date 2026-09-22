# EXPENSE-FUNC-016 gap matrix

| Stable gap | Required behavior | Implementation | Evidence |
| --- | --- | --- | --- |
| `EXPENSE-FUNC-016-FIELDS` | Split lines expose Odoo Description, Product, Employee, Taxes, Tax amount in Currency, Analytic Distribution, and Total In Currency | Shared LineItemGrid and server forms now declare the missing tax field and Odoo labels | Focused page/API contract test |
| `EXPENSE-FUNC-016-TOTALS` | Wizard computes split tax total and blocks mismatched totals | `tax_amount` aggregate plus existing exact-total warning/action guard | Datasource and mutation tests |
| `EXPENSE-FUNC-016-COST` | Non-zero-cost product cannot open/apply Split Expense | Category cost lookup drives `product_has_cost`; page and service guard enforce the boundary | Cost-guard test |
| `EXPENSE-FUNC-016-PERSISTENCE` | Source and child expenses retain correct tax values | First-line tax update and child-line tax insert are atomic with the split | Tax propagation test |
| `EXPENSE-FUNC-016-ATTACHMENTS` | Receipts remain available on generated child expenses | Existing attachments are copied with stable IDs and original metadata | Attachment-copy test |
| `EXPENSE-FUNC-016-STATES` | Empty, transport-error, stale, invalid, and permission behavior remain explicit | Existing datasource states and row-version/permission contracts preserved | Focused and Expenses regression corpus |
| `EXPENSE-FUNC-016-VISUAL` | Authenticated Odoo/Core3 desktop/mobile comparison | Blocked: tab `1770662590` was owned by `cqvt` | No visual claim |
