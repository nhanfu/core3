# Source comparison — `PURCHASE-ORDER-NOTE-001`

| Contract | Odoo 19 source | Core3 result | Status |
| --- | --- | --- | --- |
| Products-tab control | `add_note_control`, `default_display_type: line_note` | `Add a note` LineItemGrid action | implemented |
| Display-line persistence | `purchase.order.line` with `display_type = line_note` and `name` | Stable `purchase-note-*` row in `purchase_order_lines` | implemented |
| Editable state | Open, unlocked RFQs only | Draft/Sent, unlocked, current parent row-version guard | implemented |
| Display-line amount | Note has no product/amount and does not change order total | Zero quantity/total; parent total recomputed atomically | implemented |
| Note lifecycle | Inline note text can be edited/deleted while editable | Guarded note edit/delete server actions | implemented |
| Desktop/mobile authenticated comparison | Required live evidence | BrowserSkill borrow did not complete; no captures or visual claim | blocked |
| Odoo live action capture | Required before visual claim | Signed-in tab remained user-scoped | blocked |
