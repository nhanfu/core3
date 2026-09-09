# Time Off — sub-plan

Status: `planning`

## Reference

- Odoo addon: `hr_holidays` (Odoo 19 Community)
- Source availability: available in the supplied Odoo checkout
- Odoo demo data: manifest/demo records available; include approval and empty states
- Core3 service: `time-off`

## UI inventory

- Time Off dashboard, My Time Off, All Time Off, Allocations, reporting, and configuration menus.
- Calendar with month/week/list modes, color legend, employee/type filters, create request dialog, and mobile calendar.
- Requests list/kanban/form with status, employee, type, dates, duration, description, approvers, approve/refuse/cancel actions, search, group-by, and pager.
- Allocation list/form with validity, units, remaining balance, approval actions, and employee/type relations.
- Analysis graph/pivot, dashboard summary cards, empty state, approval dialogs, and responsive filter drawer.

## Core3 backend mock-data plan

Declare `timeoff_requests`, `timeoff_types`, `timeoff_allocations`, `timeoff_employees`, `timeoff_calendar`, `timeoff_balances`, `timeoff_approvals`, and `timeoff_analysis`. `default` contains overlapping calendar events, balances, pending/approved/refused requests, allocations, and relational options. States: `month_calendar`, `week_calendar`, `pending`, `approved`, `empty`, `employee_grouped`, `analysis_graph`, `analysis_pivot`, `request_form`, `mobile`.

## Shared UI primitives

Calendar/list/form views, date-range picker, duration/unit fields, status bar, approval dialog, balance cards, graph/pivot, search/filter/group controls, pager, and mobile navigation.

## Screenshots

At 1440x900 and 390x844 capture dashboard, calendar, requests list/form, allocations, and analysis views in populated, pending, and empty states for Odoo and Core3.

## Acceptance criteria

- Calendar colors, legends, request/approval workflows, allocation balances, menus, filters, and responsive controls match Odoo.
- Every event, balance, list row, form relation, graph value, pivot cell, and empty state is supplied by backend YAML mock data.
- Create/edit/save/discard, approve/refuse/cancel, date filtering, grouping, and paging work without a database.
- YAML datasource IDs remain stable for future query replacement and pass fixture completeness checks.
