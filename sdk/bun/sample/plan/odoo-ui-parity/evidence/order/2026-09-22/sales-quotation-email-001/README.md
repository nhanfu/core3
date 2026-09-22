# Sales quotation email composer evidence

Stable ID: `SALES-QUOTATION-EMAIL-001`.

This bounded slice verifies the YAML-first `sale.order.action_quotation_send`
contract on the existing `sale-order-detail` page/API pair. The Send header
action is explicitly protected by `orders.write`, opens a `mail_composer`,
persists the composer payload and attachment name, records the actor, and
moves a draft quotation to the sent quotation state.

The source and focused test evidence are captured in the sibling files. Browser
QA was attempted once with BrowserSkill against
`http://localhost:8069/core3_reference`; that exact path reached the authenticated
Odoo shell but returned Odoo 404, so no visual parity claim is made.
