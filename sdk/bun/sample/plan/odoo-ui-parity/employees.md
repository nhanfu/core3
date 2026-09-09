# Employees — sub-plan

Status: `planning`

## Reference

- Odoo addon: `hr` (Odoo 19 Community)
- Source availability: available in the supplied Odoo checkout
- Odoo demo data: manifest/demo records available; preserve demo-enabled and empty modes
- Core3 service: `employees`

## UI inventory

- Employees app, app switcher, company/user menu, and Employees dashboard.
- Employees list with search, filters, group-by (department, job, manager), favorites, pager, list/card view switcher, import/export and archive actions.
- Employee form with avatar, work/private information, department/job/manager, skills, resume, work information, contracts, equipment, and chatter/activity tabs.
- Departments, job positions, reporting hierarchy/org chart, and employee onboarding/offboarding status views.
- Mobile navbar, filter drawer, employee cards, form tabs, relational selectors, dialogs, and overflow menus.

## Core3 backend mock-data plan

Declare backend YAML datasources `employees`, `employee_summary`, `departments`, `job_positions`, `employee_skills`, `employee_contracts`, `employee_activities`, and `employee_chatter`. `default` contains enough employees for pagination, hierarchy, avatar/card rendering, and a complete form; states cover `search`, `department_grouped`, `archived`, `empty`, `form_edit`, and `mobile`. Keep page YAML datasource-only so each `mock_data` provider can later become a query.

## Shared UI primitives

Odoo shell, control panel/search, list/card/form tabs, pager, avatar, status badge, many-to-one/many-to-many fields, notebook tabs, org chart, attachment, activity and chatter widgets, archive confirmation, and responsive mobile navigation.

## Screenshots

Capture Odoo and Core3 at 1440x900 and 390x844 for dashboard, employee list populated/empty, employee form, departments, and org chart. Record route/menu/action identifiers with each capture.

## Acceptance criteria

- Menu hierarchy and all listed views/actions match Odoo labels, ordering, permissions, layout, typography, spacing, icons, and responsive behavior.
- Every visible list, card, hierarchy, form tab, activity, and chatter state has deterministic backend YAML mock data; no page fixture embeds records.
- Search/filter/group/pager, archive, edit/save/discard, relational selectors, and mobile overflow render from the declared datasource states.
- Screens remain renderable with the backend unavailable and pass the shared `screen-mock-data.md` fixture audit.
