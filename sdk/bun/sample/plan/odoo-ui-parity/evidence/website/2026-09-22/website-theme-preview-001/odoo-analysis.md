# Odoo 19 analysis

Source: `/home/nhanjs/projects/odoo/addons/website/views/website_views.xml` and
`addons/website/models/ir_module_module.py`.

- `theme_install_kanban_action` is `Pick a Theme`, uses `kanban,form`, targets
  fullscreen, and binds the kanban plus `theme_view_form_preview` views.
- `theme_view_form_preview` is non-create, non-edit, non-delete and renders the
  theme `url` with the `iframe` widget in an `o_preview_frame` container.
- Theme cards expose `Use this theme`; an installed theme exposes `Update theme`
  and `Remove theme`.
- `button_choose_theme` removes the current Website theme, sets `website.theme_id`,
  and upgrades/loads the theme stream; `button_refresh_theme` upgrades it; and
  `button_remove_theme` unloads it.
- Website theme assets are selected by the current `theme_id`; Core3 models the
  visible effect as durable validated color tokens rather than copying Odoo's
  frontend asset implementation.

The authenticated reference comparison was blocked before interaction: browser
instance `245ea108` had no confirmed borrow of the Odoo tab, and the available
authenticated tab did not expose Website.
