# Source comparison

| Odoo 19 behavior | Core3 before this slice | Bounded change |
| --- | --- | --- |
| Linked `account_move` displays the `Invoice` smart button | Order detail exposed only the create-invoice action and raw `invoice_id` | Add a read-only smart-button action guarded by `invoice_id` |
| `action_view_invoice()` opens the linked Customer Invoice form | No linked-invoice navigation or detail route | Add `view_pos_order_invoice` navigation to `/point-of-sale/invoice-detail` |
| Invoice form is read-only for the POS user in this action | POS had only an invoice list projection | Add service-owned `pos-invoice-detail` page/API with current-company scope |
| Link persists on the POS order and accounting move | No deterministic linked-invoice fixture | Migration `0.0.52` adds a durable POS invoice/order pair |

Intentional bounded difference: this slice does not create an accounting
`account.move` or alter the existing Create Invoice workflow. The Core3 POS
invoice projection is the owned target until an explicit cross-service
accounting integration slice is selected.
