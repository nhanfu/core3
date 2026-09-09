# PLM — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `mrp_plm`, Odoo 19 Community.
- Source availability: unavailable in supplied source (per main register).
- Official demo data: verify the Odoo 19 `mrp_plm` manifest when supplied; record demo declaration before implementation.
- Core3 service: `plm`.

## Menu, action, and view inventory

- PLM dashboard, Engineering Change Orders, ECO stages, BoMs, and configuration.
- ECO kanban/list with new/in progress/approval/effective/cancelled, filters, group-by, pager, and empty state.
- ECO form: product/version, BoM, stage/status, responsible, effective date, changes, approval steps, attachments, activities, and chatter.
- BoM comparison/version form, affected documents, and approval dialog; mobile cards and overflow.

## Core3 backend mock-data coverage

Declare `plm_dashboard`, `plm_ecos`, `plm_eco_stages`, `plm_products`, `plm_boms`, `plm_bom_versions`, `plm_changes`, `plm_approvals`, `plm_attachments`, and `plm_activities`. Cover each ECO state, approval pending/approved/refused, BoM version comparison, empty/filter/group/pagination, dialogs, mobile, and dashboard counts. Include before/after components, effective dates, approver options, and chatter; IDs remain stable for future queries.

## Shared UI primitives

Dashboard, list/kanban/form, stage/status bar, diff/version tables, approval steps, relational fields, attachments/activities/chatter, dialogs, pager, and responsive shell.

## Screenshots and acceptance checks

Capture documented Odoo 19 PLM routes at 1440x900 and 390x844 after source/reference access is available. Validate ECO stages, version/diff content, approvals, menu hierarchy, mobile forms, complete backend YAML fixtures, and offline rendering; resolve availability/demo-data evidence before `ready`.
