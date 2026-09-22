# Project Configuration grouped by stage — evidence

Feature: `PROJECT-CONFIGURATION-GROUPED-001`.

This bounded slice implements Odoo's manager-only Configuration > Projects
action `open_view_project_all_config_group_stage` and its
`menu_projects_config_group_stage` entry. Core3 adds the distinct
`/project-configuration-by-stage` route with page/API separation, a default
Stage grouping, the source `list,kanban,form,calendar,activity` view order,
active/archived/search/state/stage filters, and the existing durable Project
configuration CRUD actions.

Source references:

- `/home/nhanjs/projects/odoo/addons/project/views/project_menus.xml`
- `/home/nhanjs/projects/odoo/addons/project/views/project_project_views.xml`
- `services/project/pages/project-configuration-by-stage.yaml`
- `services/project/api/project-configuration-by-stage.yaml`
- `test/project_configuration_grouped.integration.test.ts`

The implementation has no migration: it reads the existing durable `projects`
and `project_stages` tables and excludes template projects as the Odoo action
domain does. This evidence is contract-level; no visual-parity claim is made.
BrowserSkill could not borrow the authenticated Odoo tab because it was already
owned by session `iqyf`; the worker session was stopped without changing or
returning the other session's tab.
