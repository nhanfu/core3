# EXPENSE-FUNC-018 source comparison

| Odoo source | Core3 contract | Result |
| --- | --- | --- |
| `addons/hr_expense/models/ir_attachment.py:10-17` allows removal only for draft/submitted expenses with write access | `remove_expense_attachment` uses `expenses.write`, state/company/parent-version guards, and a child row-version guard | Implemented |
| `addons/hr_expense/models/ir_attachment.py:19-27` allows attachment creation only for draft/submitted expenses | `upload_expense_attachment` accepts both `Draft` and `Submitted` states | Implemented |
| Odoo attachment deletion is a record mutation | `expense_attachments` gets durable `row_version` via migration `0.0.16`; removal is transactional and audited | Implemented |

The visual reference was not borrowed in this run, so this evidence does not
claim authenticated desktop/mobile parity.
