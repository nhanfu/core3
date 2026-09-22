# Odoo analysis — `PURCHASE-RFQ-CONFIRM-001`

Source inspected before implementation:

- `/home/nhanjs/projects/odoo/addons/purchase/views/purchase_views.xml:921-933`
  defines server action `action_confirm_rfqs`, label `Confirm RFQ`, bound to
  `purchase.order` list and kanban views.
- `/home/nhanjs/projects/odoo/addons/purchase/models/purchase_order.py:625-639`
  implements `button_confirm()`: Draft/Sent records are confirmable; other
  states are skipped; the approval policy may route a record to To Approve.

The bounded Core3 fixture uses the normal approval-allowed path. It does not
claim Odoo's company-level double-validation configuration or analytic
distribution validation because those inputs are outside the Purchase fixture.
