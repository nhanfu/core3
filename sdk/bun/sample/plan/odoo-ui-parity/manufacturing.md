# Manufacturing — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `mrp`, Odoo 19 Community.
- Source availability: available in the supplied Odoo 19 checkout (per main register).
- Official demo data: verify `mrp` manifest demo data; use demo BoMs, work centers, and manufacturing orders when provided.
- Core3 service: `manufacturing`.

## Menu, action, and view inventory

- Manufacturing dashboard, Operations: manufacturing orders, work orders, unbuild orders; Planning; Products: products, BoMs; Reporting; Configuration: operations, work centers, settings.
- Manufacturing-order list/kanban with draft/confirmed/progress/to-close/done/cancelled, filters, group-by, pager, and scheduling actions.
- MO form: product/quantity, BoM, components, finished moves, work orders, availability, plan/confirm/produce/close/cancel, scrap/backorder dialogs, activities, and chatter.
- BoM and work-center forms; Gantt/calendar/planning, tablet work-order screen, and report/pivot/list states.

## Core3 backend mock-data coverage

Declare `mrp_dashboard`, `mrp_orders`, `mrp_components`, `mrp_finished_moves`, `mrp_boms`, `mrp_bom_lines`, `mrp_work_orders`, `mrp_work_centers`, `mrp_scrap`, and `mrp_reports`. Cover all MO/work-order states, availability shortage, alternate BoM, scrap/backorder dialogs, empty/filter/group/pagination, tablet/mobile, calendar/Gantt, and reports. Include quantities/UoM, durations, dependencies, costs, products, and work-center options; preserve IDs for later query replacement.

## Shared UI primitives

Dashboard, control panel/search/pager, list/kanban/form, editable component lines, status bar, Gantt/calendar, tablet cards, dialogs, chatter, and report graph/pivot.

## Screenshots and acceptance checks

Capture `/odoo/manufacturing` and operations/planning/product/report/configuration routes at 1440x900 and 390x844, plus tablet work-order view if exposed. Verify BoM arithmetic, state transitions, shortage visuals, schedule layout, responsive controls, complete mocks, and offline rendering before `ready`.
