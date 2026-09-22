# Source comparison

| Odoo source | Core3 contract | Result |
| --- | --- | --- |
| `views/account_move_views.xml:2135-2144`, `action_move_block_payment`, form-bound `(Un)Block Payment`, `records.action_toggle_block_payment()` | `api/invoice-detail.yaml`, `toggle_accounting_invoice_payment_block`, `accounting.invoices.toggle_payment_block` | implemented |
| `models/account_move.py:6306-6314`, blocked → `not_paid`; reject `paid`/`in_payment`; otherwise set `blocked` | YAML mutation CASE expression plus payment-state guard | implemented |
| Odoo `account.group_account_invoice` server-action boundary | `accounting.write` action/page boundary | mapped |
| Stored Odoo `payment_state` | migration `20260922240000-057-accounting-invoice-payment-block.yaml` and invoice detail datasource | implemented for the bounded invoice store |

The Core3 mutation adds optimistic `row_version` protection because the
service contract is durable and concurrent requests must not silently toggle
an invoice using a stale form.
