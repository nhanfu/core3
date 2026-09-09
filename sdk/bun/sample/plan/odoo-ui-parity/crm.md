# CRM — sub-plan

Status: `planning`

## Reference and availability

- Odoo addon/version: `crm`, Odoo 19 Community.
- Source availability: available in the supplied Odoo 19 checkout (per main register).
- Official demo data: verified in `addons/crm/__manifest__.py`; Odoo 19 declares `crm_team_demo.xml`, `crm_stage_demo.xml`, `crm_team_member_demo.xml`, and `crm_lead_demo.xml`.
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

## Verification evidence

- Odoo 19 reference captures: `artifacts/ui-compare/odoo-crm-pipeline-desktop.png`, `artifacts/ui-compare/odoo-crm-pipeline-mobile.png`, and `artifacts/ui-compare/odoo-contacts-live.png`.
- Core3 pipeline captures: `artifacts/ui-compare/core3-crm-priority-desktop.png` and `artifacts/ui-compare/core3-crm-priority-mobile.png`; these were compared against the Odoo pipeline captures for kanban columns, cards, tags, priority, activities, totals, and mobile horizontal overflow.
- Core3 view captures: `artifacts/ui-compare/core3-crm-view-graph-desktop.png`, `artifacts/ui-compare/core3-crm-view-pivot-fixed-desktop.png`, `artifacts/ui-compare/core3-crm-view-pivot-fixed-mobile.png`, and `artifacts/ui-compare/core3-crm-view-calendar-desktop.png`.
- Core3 action captures: `artifacts/ui-compare/route-crm-crm-activities.png`, `artifacts/ui-compare/route-crm-expected-revenue.png`, `artifacts/ui-compare/route-crm-lost-opportunities.png`, and `artifacts/ui-compare/route-crm-analysis.png`.
- Core3 mobile menu captures: `artifacts/ui-compare/core3-crm-menu-crm-activities-mobile.png`, `artifacts/ui-compare/core3-crm-menu-analysis-mobile.png`, `artifacts/ui-compare/core3-crm-menu-expected-revenue-mobile.png`, `artifacts/ui-compare/core3-crm-menu-lost-opportunities-mobile.png`, `artifacts/ui-compare/core3-crm-menu-my-pipeline-mobile.png`, `artifacts/ui-compare/core3-crm-menu-unassigned-leads-mobile.png`, `artifacts/ui-compare/core3-crm-menu-unattended-leads-mobile.png`, `artifacts/ui-compare/core3-crm-menu-quality-leads-mobile.png`, `artifacts/ui-compare/core3-crm-menu-teams-mobile.png`, and `artifacts/ui-compare/core3-crm-menu-configuration-mobile.png`; all ten routes returned without a page-load error.
- Core3 form captures: `artifacts/ui-compare/core3-crm-detail-current-desktop.png`, `artifacts/ui-compare/core3-crm-detail-current-mobile.png`, `artifacts/ui-compare/core3-crm-edit-desktop.png`, and `artifacts/ui-compare/core3-crm-edit-mobile.png`.
- Core3 workflow dialog captures: `artifacts/ui-compare/core3-crm-mark-lost-desktop.png` and `artifacts/ui-compare/core3-crm-mark-lost-mobile.png`; both show the required Lost reason selector and Cancel/Save actions.
- Core3 fixture-state captures: `artifacts/ui-compare/core3-crm-state-filtered-desktop.png`, `artifacts/ui-compare/core3-crm-state-filtered-mobile.png`, `artifacts/ui-compare/core3-crm-state-empty-desktop.png`, and `artifacts/ui-compare/core3-crm-state-empty-mobile.png`.
- Core3 error-state captures: `artifacts/ui-compare/core3-crm-state-error-desktop.png` and `artifacts/ui-compare/core3-crm-state-error-mobile.png`; the browser confirmed the 503 error boundary renders at both viewports.
- Forecast comparison captures: Odoo `artifacts/ui-compare/odoo-crm-forecast-desktop.png` compared with Core3 `artifacts/ui-compare/core3-crm-forecast-fixed-desktop.png` and `artifacts/ui-compare/core3-crm-forecast-fixed-mobile.png`; the four closing-period totals and ten opportunity cards are aligned, including the October `$15,500` total.
- Forecast report captures: Odoo `artifacts/ui-compare/odoo-crm-forecast-graph-desktop.png` and `artifacts/ui-compare/odoo-crm-forecast-pivot-desktop.png` compared with Core3 `artifacts/ui-compare/core3-crm-forecast-graph-fixed.png` and `artifacts/ui-compare/core3-crm-forecast-pivot-total.png`; Core3 now renders period rows, stage columns, a Total row, and the `Prorated Revenue` measure.
- The current status remains `planning`: a final comparison of every action's mobile geometry, plus remaining CRM workflow/report states, is still outstanding.
