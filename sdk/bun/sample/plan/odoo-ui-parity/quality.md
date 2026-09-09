# Quality — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `quality`, Odoo 19 Community.
- Source availability: unavailable in supplied source (per main register); screen parity proceeds from documented Odoo 19 behavior and captured references.
- Official demo data: verify against the Odoo 19 `quality` manifest when source is supplied; record whether demo files exist before implementation.
- Core3 service: `quality`.

## Menu, action, and view inventory

- Quality dashboard, Quality Checks, Quality Alerts, Control Points, Quality Teams, and Configuration.
- Check list/kanban with pending/pass/fail states, filters, group-by, pager, and empty state.
- Check form: product/order/operation, control point, measure/instructions, worksheet, pass/fail, failure reason, attachments, and chatter.
- Alert list/kanban/form: priority, team, responsible, root cause, corrective/preventive actions, stages, activities, and chatter.
- Control-point/team forms, calendar where exposed, and mobile check/alert flows.

## Core3 backend mock-data coverage

Declare `quality_dashboard`, `quality_checks`, `quality_alerts`, `quality_control_points`, `quality_teams_users`, `quality_products`, `quality_operations`, `quality_worksheets`, `quality_failure_reasons`, and `quality_activities`. Cover pending/pass/fail, alert stages/priorities, measurable and binary checks, empty/filter/group/pagination, failure dialog, calendar/mobile, and dashboard counts. Include all relational options and attachments; datasource IDs are query-swappable.

## Shared UI primitives

Dashboard, control panel/search/pager, list/kanban/form/calendar, status/priority, measurement widgets, worksheets, dialogs, attachments/chatter, and responsive navigation.

## Screenshots and acceptance checks

Capture documented Odoo 19 quality routes at 1440x900 and 390x844 once source/reference access is available. Compare menu/view states, pass/fail affordances, alert workflow, dashboard counts, mobile check flow, declared mocks, and offline rendering; do not mark `ready` until source availability and demo-data claims are verified.
