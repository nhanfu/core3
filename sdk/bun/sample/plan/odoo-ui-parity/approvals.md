# Approvals — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `approvals`, Odoo 19 Community.
- Source availability: unavailable in supplied source (per main register).
- Official demo data: verify the Odoo 19 `approvals` manifest when supplied; record demo declaration before implementation.
- Core3 service: `approvals`.

## Menu, action, and view inventory

- Approvals dashboard, My Requests, All Requests, Approval Types, and configuration.
- Request kanban/list with draft/submitted/approved/refused/cancelled, filters, group-by, pager, and empty state.
- Request form: approval type, requester, date, requested amount, description, approver steps, attachments, activities, approve/refuse/cancel actions, and chatter.
- Approval-type form: category, fields, approvers, sequence, company, and active status; mobile request and dialogs.

## Core3 backend mock-data coverage

Declare `approval_dashboard`, `approval_requests`, `approval_types`, `approval_steps`, `approval_users`, `approval_attachments`, `approval_activities`, and `approval_settings`. Cover every request/step state, sequential and parallel approvers, amount/category fields, empty/filter/group/pagination, approve/refuse/cancel dialogs, mobile, and dashboard counts. Include requester/approver relations, dates, comments, and attachments; preserve IDs for later queries.

## Shared UI primitives

Dashboard cards, list/kanban/form, status/stepper, relational fields, amount/date fields, attachment/activity/chatter, dialogs, search/pager, and responsive shell.

## Screenshots and acceptance checks

Capture documented Odoo 19 Approvals routes at 1440x900 and 390x844 when source/reference access is available. Check step ordering, state/action visibility, category configuration, empty results, mobile form, fixture completeness, and offline rendering before `ready`.
