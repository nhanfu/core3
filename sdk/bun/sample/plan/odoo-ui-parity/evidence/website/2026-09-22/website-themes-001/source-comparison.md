# Source comparison

| Odoo source contract | Core3 path | Result |
| --- | --- | --- |
| `theme_install_kanban_action` / `Pick a Theme` | `services/website/pages/themes.yaml`, `services/website/api/themes.yaml` | Implemented as YAML page/API pair with matching `page.id` |
| Theme and Category search | `api/themes.yaml` datasource predicates | Implemented; empty branch is tested |
| Author and Category grouping | `pages/themes.yaml` `group_by` | Implemented declaratively |
| Installed-on-current-website state | `website_websites.theme_id`, theme datasource join | Implemented durably per Website |
| `Use this theme` | `choose_website_theme` action | Implemented with `website.manage`, availability, duplicate, and row-version guards |
| `Update theme` | `refresh_website_theme` action | Implemented as synchronous revision increment with stale/current-theme guards |
| `Remove theme` | `remove_website_theme` action | Implemented with current-theme and row-version guards |
| Odoo preview iframe/form | Not in this bounded slice | Open follow-up; no completion claim |
| Odoo theme module installation side effects | Not in this bounded slice | Open follow-up; Core3 persists selection/revision only |
