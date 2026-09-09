# CRM — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `crm`, Odoo 19 Community.
- Source availability: available in the supplied Odoo 19 checkout (per main register).
- Official demo data: verify the `crm` manifest's demo declaration before capture; use the official demo records when present.
- Core3 service: `crm`.

## Menu, action, and view inventory

- CRM dashboard, My Activities, Pipelines, Leads, and Opportunities.
- Customers and the contact smart-link opened from a lead/opportunity.
- Kanban pipeline with stage columns, folded stages, cards, drag/drop, activities, and empty pipeline.
- Lead/opportunity list, search panel, filters, group-by, list/kanban switch, pager, and import/action menus.
- Lead/opportunity form: status bar, probability, expected revenue, activities, tags, salesperson/team, customer, notebook, chatter, and save/discard.
- Reporting: Pipeline, Forecast, Lost Reasons, and graph/pivot/list variants.
- Mobile navbar, control-panel overflow, card/list/form layouts, and modal quick-create.

## Core3 backend mock-data coverage

Declare these IDs in the screen backend datasource YAML using `mock_data.default` and named `states` (never inline records in page-layout YAML): `crm_pipeline_stages`, `crm_leads`, `crm_opportunities`, `crm_customers`, `crm_activities`, `crm_tags`, `crm_teams_users`, `crm_lost_reasons`, `crm_pipeline_report`, `crm_forecast_report`. Cover populated, filtered, grouped, paginated, quick-create/dialog, lost, empty, mobile, and error states. Include stage totals, monetary currencies, dates, avatars, relational options, chatter, attachments, and activity counts so each view is non-blank. Each ID must later accept a `query` in place of `mock_data`.

## Shared UI primitives

Odoo shell, app switcher, breadcrumb, control panel, search panel, view switcher, pager, kanban cards/columns, status bar, many2one/tag fields, activity widget, smart buttons, graph/pivot renderer, chatter, dialogs, notifications, and responsive navbar.

## Screenshots and acceptance checks

Capture `/odoo/crm` plus each listed action at 1440x900 and 390x844, including populated and empty/filter states. Compare menu hierarchy, pipeline columns, card/list/form geometry, typography, icons, colors, responsive overflow, and report totals. Verify every visible field and report cell has deterministic YAML data, backend-offline rendering works, and no page YAML embeds fixture records before marking `ready`.
