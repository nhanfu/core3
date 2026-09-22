# Source comparison

| Odoo behavior | Core3 implementation | Status |
| --- | --- | --- |
| `action_website_pages_list` targets `website.page` with list and kanban views | Existing `website-pages` ListView/Kanban page is unchanged | implemented before this wave |
| Page Manager uses the standard Web import affordance for `website.page` records | `Import` header action opens `import_website_pages`, a `website.write` YAML server form | implemented |
| Imported rows identify a Website and Page URL and write page metadata | Validated `Website ID\|Page Title\|Page URL\|State\|Indexed\|In Main Menu\|SEO Optimized\|Tracked` rows upsert by `(website_id, url)` | implemented |
| Invalid rows and missing websites are rejected before mutation | Required, format, existing-site, and duplicate-row guards return stable 422 codes | implemented |
| Authenticated Website writers may import; readers may not mutate | Visible/header and endpoint action both require `website.write`; dispatcher test proves 403 with no write | implemented |
| Odoo import dialog and authenticated desktop/mobile comparison | Shared signed-in Odoo tab was unavailable to this worker | blocked / not claimed |

Source paths inspected:

- `/home/nhanjs/projects/odoo/addons/website/views/website_pages_views.xml`
- `/home/nhanjs/projects/odoo/addons/web/static/src/views`
- `sdk/bun/sample/services/website/pages/pages.yaml`
- `sdk/bun/sample/services/website/api/pages.yaml`
