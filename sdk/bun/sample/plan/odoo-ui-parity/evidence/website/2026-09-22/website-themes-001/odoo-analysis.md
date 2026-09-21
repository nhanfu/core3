# Odoo 19 analysis

Source: `/home/nhanjs/projects/odoo/addons/website/views/website_views.xml`.

- `theme_install_kanban_action` is named `Pick a Theme`, targets `ir.module.module`,
  and declares `kanban,form` with a fullscreen target.
- `theme_view_kanban` shows icon/preview, summary, category, display name, and
  whether the theme is installed on the current Website.
- Available cards expose `Use this theme`; the installed card exposes `Update
  theme` and `Remove theme`.
- `theme_view_search` provides Theme and Category search fields and Author and
  Category grouping.
- Website `theme_id` persists the installed theme for the current Website;
  Odoo computes `is_installed_on_current_website` from that relation.
- The action is launched from Website settings/configurator, not a standalone
  menu item. Core3 binds it through the Website detail `Pick a Theme` action
  and adds a discoverable Website > Site > Themes route alias.

The live authenticated reference at `http://localhost:8069`, database
`core3_reference`, was inspected at desktop and 390x844 mobile sizes. The
launcher exposed Discuss/OdooBot and no Website application or Theme action.
The exact blocker is recorded in `verification.md`.
