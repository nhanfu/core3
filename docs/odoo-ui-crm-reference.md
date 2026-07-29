# Odoo CRM UI Reference

This traceability note records the Odoo checkout used for the first Core3 CRM
slice. It is a reference only; the CRM app does not import or execute Odoo.

## Reference snapshot

- Checkout: `/home/nhanjs/projects/odoo`
- Branch: `19.0`
- Commit: `659759969d535d286b656c96b675e4612b925ddd`
- Product marker: Community CRM module, with Enterprise-style view families
  (graph, pivot, calendar, chatter, and responsive web client patterns) used as
  UI references only.

## Source traceability

| Core3 concern | Odoo source | Core3 artifact |
| --- | --- | --- |
| CRM manifest and dependencies | `addons/crm/__manifest__.py` | `apps/crm/module.yaml` |
| Lead model and fields | `addons/crm/models/crm_lead.py` | `apps/crm/module.yaml`, `schema.sql` |
| Lead/opportunity list, form, kanban, search | `addons/crm/views/crm_lead_views.xml` | `apps/crm/module.yaml`, `lib/components/Odoo*.ts` |
| Calendar views | `addons/crm/views/calendar_views.xml` | `lib/components/OdooAnalyticsViews.ts` |
| CRM menus and actions | `addons/crm/views/crm_menu_views.xml` | `apps/crm/module.yaml` |
| Stage and team data | `addons/crm/models/crm_stage.py`, `data/crm_stage_data.xml` | `apps/crm/schema.sql`, `seed.sql` |
| Mail activities and chatter | `addons/crm/models/mail_activity.py`, `addons/mail` | `apps/crm/database.ts`, `OdooChatter.ts` |
| Security and access patterns | `addons/crm/security/` | fixture API boundary and metadata contract |
| Interaction tours | `addons/crm/static/tests/tours/` | browser workflow audit |

## Screen inventory

| Screen | Odoo reference | Core3 action/view |
| --- | --- | --- |
| Pipeline | `crm_lead_action_pipeline`, `crm_case_kanban_view_leads` | `crm.pipeline` / kanban |
| Opportunity or lead form | `crm_lead_view_form` | `crm.pipeline` or `crm.leads` / form |
| Leads and opportunities list/search | `crm_lead_all_leads`, `crm_lead_opportunities`, tree/search views | `crm.leads` or `crm.pipeline` / list |
| Activities list/calendar and scheduling | `addons/mail/views/mail_activity_views.xml`, CRM activity actions | `crm.activities`, `/api/crm/activities`, `OdooCalendarView` |
| Teams and customers | CRM team/partner models and form views | `crm.teams`, team-scoped pipeline, customer opportunities/activities, relation services in `database.ts` |
| Forecast and analysis | CRM graph/pivot/forecast actions and views | `/api/crm/report/*`, graph/pivot views, report drill-down routes |
| Configuration and import | CRM settings, stage, tag, lost-reason, and import actions | `crm.settings`, `crm.import`, manager API checks, stage requirements, and import success/error history |
| Global application switching | Web client app switcher and navigation chrome patterns | `AppRegistry`, `AppLauncher`, `OdooShell`, `ActionService` |

## Phase 2 evidence map

| Behavior | YAML/menu | Implementation | Automated evidence |
| --- | --- | --- | --- |
| App launcher and Coming Soon modules | `apps`, `crm.root` | `OdooShell`, `AppLauncher`, `renderAppPlaceholder` | `app-registry.test.ts`, `odoo-shell.test.ts`, `api.test.ts`, `browser-smoke.ts` |
| Dirty navigation and metadata routing | actions/menus | `ActionRouter`, `ActionService`, `UnsavedChangesGuard` | `unsaved-changes-guard.test.ts`, `action-service.test.ts` |
| Lead lifecycle and permissions | `crm.pipeline`, `crm.leads` | `server.ts`, `database.ts`, form/kanban workflows | `database.test.ts`, `api.test.ts` |
| Activities and chatter | `crm.activities` | activity repository, chatter, list/calendar UI | `database.test.ts`, `odoo-calendar-view.test.ts` |
| Reports and drill-down | reporting/forecast actions | report queries and drill-down routes | `database.test.ts`, `api.test.ts` |
| Manager configuration/import | settings/import menus | manager API boundaries, persisted catalogs/history, and add-configuration dialog | `database.test.ts`, `api.test.ts`, `browser-smoke.ts` |
| Team scope and concurrent edits | team/lead workflows | team pipeline query and `crm_lead.write_version` conflict checks | `database.test.ts`, `api.test.ts` |

The Core3 fixture deliberately keeps the data model small, but exercises the
same shared action, model, relation, view, and mutation seams.
