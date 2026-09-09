# Field Service — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `industry_fsm`, Odoo 19 Community.
- Source availability: unavailable in supplied source (per main register).
- Official demo data: verify the Odoo 19 `industry_fsm` manifest when supplied; record demo declaration before implementation.
- Core3 service: `field-service`.

## Menu, action, and view inventory

- Field Service dashboard, My Tasks, All Tasks, Planning, Map, Worksheets, Timesheets, Products, and Reporting.
- Task list/kanban/map/calendar with new/assigned/in progress/done/cancelled, filters, group-by, pager, and empty state.
- Task form: customer/site address, assignee, planned dates, stage, worksheet, materials, timesheets, signatures, instructions, activities, attachments, and chatter.
- Planning/calendar/map interactions, route/address dialogs, mobile technician task view, timer, and sign-off.

## Core3 backend mock-data coverage

Declare `fsm_dashboard`, `fsm_tasks`, `fsm_customers_sites`, `fsm_users`, `fsm_planning`, `fsm_map_points`, `fsm_worksheets`, `fsm_materials`, `fsm_timesheets`, `fsm_signatures`, and `fsm_reports`. Cover all task states, assigned/unassigned, map/calendar/planning, empty/filter/group/pagination, worksheet/signature dialogs, mobile/offline, and reports. Include geo coordinates, addresses, durations, products, quantities, and relational choices; retain query-swappable datasource IDs.

## Shared UI primitives

Dashboard, list/kanban/calendar/map, search/pager, address/map marker, worksheet, timer/timesheet, signature, activity/chatter, dialogs, and responsive/mobile navigation.

## Screenshots and acceptance checks

Capture documented Odoo 19 field-service routes at 1440x900 and 390x844 when source/reference access is available. Check map/planning geometry, task workflow, address/worksheet/signature states, mobile technician flow, complete mocks, and offline rendering before `ready`.
