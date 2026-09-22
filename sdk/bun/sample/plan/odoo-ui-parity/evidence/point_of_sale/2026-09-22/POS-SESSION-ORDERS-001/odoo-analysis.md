# Odoo analysis

Reference: local Odoo 19 source under `/home/nhanjs/projects/odoo`.

- View: `addons/point_of_sale/views/pos_session_view.xml`
- Model: `addons/point_of_sale/models/pos_session.py`
- Source action: `pos.session.action_view_order()`
- Visible control: session form stat button labelled `Orders`, icon
  `fa-shopping-basket`, showing `order_count`.
- Action contract: `res_model=pos.order`, `view_mode=list,form`, and domain
  `[('session_id', 'in', self.ids)]`.
- Permission context: the session menu is visible to POS users; this bounded
  Core3 projection requires `pos.read` and applies current-company scope.

The existing Core3 session detail already displayed an inline Orders grid, but
that did not reproduce the Odoo action's navigable filtered list. The selected
gap is therefore the action/list navigation, not another order datasource.

Live inspection blocker: BrowserSkill daemon instance `245ea108` was healthy
and listed the existing authenticated Odoo tab, but `bsk tab borrow` waited for
browser confirmation and timed out. The tab remained user-scoped. No
credential, cookie, token, or independent login was used; no live Odoo
desktop/mobile capture was created.
