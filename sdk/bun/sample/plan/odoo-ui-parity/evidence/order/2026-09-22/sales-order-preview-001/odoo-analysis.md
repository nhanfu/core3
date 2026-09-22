# Odoo analysis

- Addon: `sale` / `sale_management`, Odoo 19 Community.
- Model action: `sale.order.action_preview_sale_order` is marked
  `@api.readonly`, requires one record, and returns an `ir.actions.act_url` with
  `target: self` and `url: self.get_portal_url()`.
- Form contract: `sale/views/sale_order_views.xml` exposes a `Preview` object
  button named `action_preview_sale_order` in the Sales Order form header.
- Portal content contract used for the bounded read-only Core3 surface comes
  from `sale/views/sale_portal_templates.xml`: order/customer/date information,
  order lines, totals, and terms/conditions.
- Live browser inspection was blocked before observation: the signed-in tab was
  already borrowed by another BrowserSkill session. Therefore no live Odoo
  desktop/mobile visual details or screenshots are asserted here.
