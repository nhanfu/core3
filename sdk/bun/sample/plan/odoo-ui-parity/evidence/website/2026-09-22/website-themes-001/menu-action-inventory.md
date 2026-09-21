# Menu and action inventory

| Source identity | Core3 identity | Permission |
| --- | --- | --- |
| Odoo `theme_install_kanban_action`, `Pick a Theme` | `/website-themes`, `website-themes` | `website.read` to view |
| Odoo Website settings/configurator launch | Website detail `Pick a Theme` header action | `website.manage` |
| Odoo `button_choose_theme` | `choose_website_theme` / `website.themes.choose` | `website.manage` |
| Odoo `button_refresh_theme` | `refresh_website_theme` / `website.themes.refresh` | `website.manage` |
| Odoo `button_remove_theme` | `remove_website_theme` / `website.themes.remove` | `website.manage` |

Core3's Website > Site > Themes manifest item is a deliberate route alias for
the Odoo settings-launched action; Odoo does not define a standalone Themes
menu item in `website_views.xml`.
