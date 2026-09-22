# Odoo analysis

- Addon/version: local Odoo 19 Project addon at
  `/home/nhanjs/projects/odoo/addons/project`.
- Menu: Project > Configuration > Projects.
- Menu XML ID: `menu_projects_config`.
- Action XML ID: `open_view_project_all_config`.
- Action path: `/odoo/project-configuration`.
- Model: `project.project`.
- Domain: `is_template = False`.
- View order: `list,kanban,form`.
- Configuration list variant: sequence handle/order, project name, customer,
  company, planned date, manager, stage/status, and View Tasks action.
- Configuration kanban removes the normal project-card action; the form is the
  project form.
- Visibility: Project manager menu; Settings is additionally system-only.

The live authenticated action could not be opened. The first borrow was refused
because tab `1770662590` was already borrowed by BrowserSkill session `expk` on
instance `245ea108`; a later fresh borrow timed out without confirmation.
