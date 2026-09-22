# Gap matrix

| ID | Gap | Implementation | Evidence |
| --- | --- | --- | --- |
| G1 | Detail query did not expose the order email | Add `customer_email` to the service-owned detail datasource | Focused projection assertion |
| G2 | Detail form had no Odoo `action_send_mail` action | Add `send_pos_order_detail_email` header/API action with `pos.write` and visibility guard | Contract test |
| G3 | Detail action had no prefilled composer fields | Bind recipient, subject, and body to the detail projection | Contract test and YAML review |
| G4 | Detail flow needed durable side effects | Reuse `pos_order_email_runs` and `pos_operations` with existing queue guards | Mutation/restart assertions |
| G5 | Current browser proof unavailable | Use BrowserSkill instance `245ea108`, record failed borrow and preserve no-claim status | `verification.md` |
