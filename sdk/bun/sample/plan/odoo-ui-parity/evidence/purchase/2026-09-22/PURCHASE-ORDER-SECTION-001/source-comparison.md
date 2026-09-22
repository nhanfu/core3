# Source comparison — `PURCHASE-ORDER-SECTION-001`

| Contract | Odoo 19 source | Core3 result | Status |
| --- | --- | --- | --- |
| Products-tab control | `add_section_control`, `default_display_type: line_section` | `Add a section` LineItemGrid action | implemented |
| Display-line persistence | `purchase.order.line` with `display_type = line_section` and name | Stable `purchase-section-*` row in `purchase_order_lines` | implemented |
| Editable state | Existing Purchase order form is editable only for open, unlocked RFQs | Draft/Sent, unlocked, current parent row version guard | implemented |
| Display-line amount | Section has no product/amount and does not change order total | Zero quantity/total; parent total recomputed atomically | implemented |
| Section lifecycle | Inline section name can be edited/deleted while editable | Guarded section edit/delete server actions | implemented |
| Desktop/mobile authenticated comparison | Required live evidence | BrowserSkill borrow timed out; no captures or visual claim | blocked |
| Add a note | Adjacent Odoo control | Intentionally separate follow-up | not claimed |
