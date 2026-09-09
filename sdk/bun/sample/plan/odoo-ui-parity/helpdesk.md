# Helpdesk — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `helpdesk`, Odoo 19 Community.
- Source availability: unavailable in supplied source (per main register).
- Official demo data: verify the Odoo 19 `helpdesk` manifest when supplied; record demo declaration before implementation.
- Core3 service: `helpdesk`.

## Menu, action, and view inventory

- Helpdesk dashboard, Tickets, My Tickets, Teams, SLA Policies, Reporting, and Configuration.
- Ticket kanban/list with new/in progress/pending/solved/closed, priority, filters, group-by, pager, and empty state.
- Ticket form: team, stage, customer, email, priority, tags, assigned user, SLA/deadline, description, activities, attachments, email actions, and chatter.
- Team/dashboard cards, SLA analysis graph/pivot/list, activity/calendar where exposed, and mobile ticket form.

## Core3 backend mock-data coverage

Declare `helpdesk_dashboard`, `helpdesk_tickets`, `helpdesk_teams_users`, `helpdesk_customers`, `helpdesk_stages`, `helpdesk_tags`, `helpdesk_sla`, `helpdesk_activities`, `helpdesk_attachments`, and `helpdesk_reports`. Cover all ticket stages/priorities, SLA on-track/breached, assigned/unassigned, empty/filter/group/pagination, email/activity dialogs, mobile, and report states. Include deadlines, counters, chatter, and relational options; IDs remain query-swappable.

## Shared UI primitives

Dashboard cards, list/kanban/form/calendar, control panel/search/pager, priority/status/SLA badges, tags, activities/chatter, attachments/email dialog, reports, and responsive shell.

## Screenshots and acceptance checks

Capture documented Odoo 19 helpdesk routes at 1440x900 and 390x844 when source/reference access is available. Verify stage/SLA visuals, ticket form, team menus, report totals, mobile flow, deterministic datasource coverage, and offline rendering before `ready`.
