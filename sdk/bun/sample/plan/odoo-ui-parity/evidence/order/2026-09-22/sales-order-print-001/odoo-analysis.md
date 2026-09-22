# Odoo analysis

- Addon/version: `sale` / Odoo 19 Community, used by `sale_management`.
- Form source: `/home/nhanjs/projects/odoo/addons/sale/views/sale_order_views.xml`.
- Report source: `/home/nhanjs/projects/odoo/addons/sale/report/ir_actions_report.xml`.
- Form action: label `Print`, action `sale.action_report_saleorder`, type
  `action`, hotkey `i`, invisible only when `state == 'sale'`.
- Report contract: name `Quotation / Order`, model `sale.order`, report type
  `qweb-pdf`, report/template `sale.report_saleorder`, filename expression
  `Quotation - <number>` for draft/sent and `Order - <number>` otherwise.
- This worker also attempted the requested live reference inspection through
  BrowserSkill instance `245ea108`; see `browser-blocker.txt`. No live visual
  observation or screenshot is claimed because tab ownership was not obtained.
