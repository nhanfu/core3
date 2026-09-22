# EXPENSE-FUNC-016 source comparison

| Odoo source | Contract | Core3 before | Core3 after |
| --- | --- | --- | --- |
| `hr_expense_split_wizard_views.xml:8-58` | Wizard shows tax amount, Odoo field labels, exact-total warning, and footer action state | Tax amount existed only in backend line data; wizard and grid omitted it | Wizard summary and line grid expose Taxes and Tax amount in Currency, Description, Total In Currency, and the existing mismatch warning |
| `hr_expense_views.xml:126-130` | Split action is unavailable for non-zero-cost products | Header action was visible for every draft expense | Service source exposes `product_has_cost`; page visibility and mutation guard enforce `EXPENSE_SPLIT_COST_PRODUCT` |
| `hr_expense_split_wizard.py:57-91` | First split line updates the source, remaining lines become child expenses | Source tax amount was not updated from the first split line | Source amount and tax amount are updated atomically; child rows retain each line tax |
| `hr_expense_split_wizard.py:72-80` | Source receipt attachments are copied to child expenses | Child expenses had no copied attachment rows | Stable attachment IDs copy every source attachment to each generated child |

The page remains presentation-only. Datasources and mutations remain in the
Expenses API fragment joined by `page.id: expense-detail`; existing durable
`expense_split_lines` and `expense_attachments` tables are reused.
