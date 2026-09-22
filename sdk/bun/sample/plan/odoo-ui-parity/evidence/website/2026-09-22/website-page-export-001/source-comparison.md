# Source comparison

| Odoo behavior | Core3 implementation | Status |
| --- | --- | --- |
| `action_website_pages_list` targets `website.page` with `list,kanban` views | Existing `website-pages` route and ListView/Kanban YAML | implemented before this wave |
| Standard Web export is available from the list view and downloads XLSX | `website.pages.export` client action plus the shared `.export` ListView renderer | implemented |
| Export respects the active Page Manager domain/search | Renderer pages through the existing `website_pages` datasource with current filters | implemented |
| Export is visible only to an authenticated Website reader | Action declaration and visible control both require `website.read` | implemented |
| Odoo export field-selection dialog and authenticated desktop/mobile comparison | Odoo Web source inspected locally; shared signed-in tab was unavailable to this worker | blocked / not claimed |

Source paths inspected:

- `/home/nhanjs/projects/odoo/addons/website/views/website_pages_views.xml`
- `/home/nhanjs/projects/odoo/addons/web/static/src/views/view_hook.js`
- `/home/nhanjs/projects/odoo/addons/web/static/src/views/view_dialogs/export_data_dialog.xml`
- `sdk/bun/sample/services/website/pages/pages.yaml`
- `sdk/bun/sample/services/website/api/pages.yaml`
