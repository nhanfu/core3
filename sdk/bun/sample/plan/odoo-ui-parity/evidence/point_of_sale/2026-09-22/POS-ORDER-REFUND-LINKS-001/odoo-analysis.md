# Odoo analysis

Source: Odoo 19 `point_of_sale` under `/home/nhanjs/projects/odoo`.

- `views/pos_order_view.xml` defines smart buttons `Refunds` and
  `Refunded Orders`, hidden when `refund_orders_count == 0` and when
  `refunded_order_id` is empty respectively.
- `models/pos_order.py` computes `refund_orders_count` from related refund
  order lines and `refunded_order_id` from the reverse relation.
- `action_view_refund_orders()` opens `Refund Orders` as a `list,form` action
  constrained to the related refund order IDs.
- `action_view_refunded_order()` opens the original order form by `res_id`.
- `refund()` creates a new draft order with negative quantities in an open
  session for the source POS. This feature consumes that existing relationship;
  it does not reimplement Return Products.

Authenticated reference observations at `http://localhost:8069` using browser
instance `245ea108` and the local QA session:

- A normal paid order initially hides both relationship buttons.
- After Return Products, the source order showed `1 Refunds` and the refund
  draft showed `Furniture Shop - 000004 Refunded Orders`.
- `Refunds` opened a `Refund Orders` list with the negative draft order.
- The reverse smart button returned to the original order.
- The temporary reference refund was deleted afterward, restoring the original
  four-order reference state.
