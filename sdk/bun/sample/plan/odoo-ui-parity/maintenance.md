# Maintenance — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `maintenance`, Odoo 19 Community.
- Source availability: available in the supplied Odoo 19 checkout (per main register).
- Official demo data: verify manifest demo declaration; use demo equipment, teams, and requests when provided.
- Core3 service: `maintenance`.

## Menu, action, and view inventory

- Maintenance dashboard, Maintenance Requests, Equipment, Equipment Categories, Teams, Calendar, and reporting.
- Request list/kanban/calendar with new/requested/in progress/repaired/scrap states, priorities, search/filter/group/pager, and empty state.
- Request form: subject, equipment, category, team, technician, priority, duration, schedule, description, activities, attachments, chatter, and stage actions.
- Equipment form: serial/model/vendor/location, warranty, preventive schedule, metrics, maintenance history, and smart links.
- Mobile request cards, calendar, quick-create, and overflow actions.

## Core3 backend mock-data coverage

Declare `maintenance_requests`, `maintenance_equipment`, `maintenance_categories`, `maintenance_teams_users`, `maintenance_calendar`, `maintenance_activities`, `maintenance_attachments`, and `maintenance_summary`. Cover each request state/priority, scheduled/overdue preventive work, empty/filter/group/pagination, calendar, quick-create, mobile, and report fixtures. Include relational options, dates/durations, counters, and history; retain stable IDs for later queries.

## Shared UI primitives

Dashboard cards, list/kanban/calendar/form, priority/status widgets, many2one/tags, activity/chatter/attachments, pager, dialogs, and responsive navigation.

## Screenshots and acceptance checks

Capture `/odoo/maintenance` dashboard, requests, equipment, calendar, and reporting at 1440x900 and 390x844. Check stage/priority presentation, calendar placement, smart counts, empty results, mobile form, mock completeness, and offline rendering before `ready`.
