# CRM parity batch 1: lead and opportunity pipeline

Status: `implemented`

This batch covers the highest-value CRM Sales entry surfaces: My Pipeline,
Leads, My Activities, Teams, Customers, and the existing lead detail workflow.
The CRM root now enters `/my-pipeline`, whose first view is a stage-grouped
kanban backed by `crm_my_pipeline`; List and Cards remain available through the
same page contract. `crm_my_pipeline_stages` supplies stable labels and status
colors, and `crm_my_pipeline_teams` supplies the team facet.

## Route contract

| Odoo source action/menu | Core3 page and route | Backend contract |
| --- | --- | --- |
| `crm.action_your_pipeline` / My Pipeline | `my-pipeline` / `/my-pipeline` | `api/my-pipeline.yaml`, `crm_my_pipeline` |
| `crm.crm_lead_all_leads` / Leads | `leads` / `/leads` | `api/leads.yaml`, `crm_leads` |
| `crm.crm_lead_action_my_activities` / My Activities | `crm-activities` / `/crm-activities` | `api/activities.yaml`, `crm_activity_queue` |
| `sales_team.crm_team_action_pipeline` / Teams | `teams` / `/teams` | `api/teams.yaml`, `crm_teams` |
| `base.action_partner_form` / Customers | `/contacts` | Base-owned Contacts page; CRM does not duplicate it |

## Reference limitation

The authenticated Odoo 19 reference was checked on 2026-09-10, but `crm` is
`uninstalled`; `/odoo/crm` resolves to Discuss and CRM is absent from the home
menu. Therefore this batch uses the source-defined contracts in
`/home/nhanjs/projects/odoo/addons/crm/views/crm_menu_views.xml` and
`crm_lead_views.xml` for route/action intent. The live Odoo surface is not
claimed as visual or row-level parity evidence, and the Odoo database was not
mutated or installed.

## Data and storage boundary

Pipeline rows, stage groups, and team facets are CRM-local deterministic
migration data. The page does not join Base contacts or Order quotations in
SQL. Contact lookup and quotation behavior remain declared service operations
on the existing detail/create contracts; isolated memory-mode services must
not be queried as shared tables.

Screenshots belong under `/tmp/core3-odoo-parity/` and are intentionally not
tracked. Final browser evidence records the authenticated user, route, page
ID, fixture state, and viewport after the server is started in memory mode.
