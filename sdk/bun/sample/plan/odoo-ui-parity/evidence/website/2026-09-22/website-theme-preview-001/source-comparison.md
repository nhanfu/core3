| Odoo source contract | Core3 path | Result |
| --- | --- | --- |
| `theme_view_form_preview`, read-only iframe form | `pages/theme-preview.yaml`, `api/theme-preview.yaml` | Implemented as a permissioned read-only form/API pair; the public opener preserves the selected preview URL and scope |
| Theme card opens preview form | `pages/themes.yaml`, `api/themes.yaml` | Implemented as `open_website_theme_preview` navigation action |
| `button_choose_theme` / `website.theme_id` | Existing `choose_website_theme` plus theme-effects migrations | Installed theme remains durable and now exposes its visual token effect |
| Theme asset reload on selection | `operations.yaml`, `PublicWebsitePage.ts`, Website styles | Implemented as a first-party YAML-backed token effect; Odoo frontend assets are not copied |
| Odoo fullscreen iframe visual state | No authenticated capture available | Runtime contract covered; paired visual comparison blocked |
