# CRM-TEAM-LEADS-001 — Sales Team Leads stat action

## Source contract

- Odoo 19 Community source: `/home/nhanjs/projects/odoo/addons/crm/views/crm_team_views.xml`.
- Stable source action: `crm_case_form_view_salesteams_lead` (`Leads`).
- Source contract: `crm.lead`, domain `type = lead` (or unset), list/kanban/form views, team context/defaults, and team-scoped create.
- This is distinct from `crm_case_form_view_salesteams_opportunity` and `crm_lead_action_team_overdue_opportunity`, which are already implemented separately.

## Core3 bounded slice

- Page/API join: `crm-team-leads`.
- Route: `/crm/team-leads`, opened by the CRM team form `Leads` stat button.
- CRM-owned files: `pages/team-leads.yaml`, `api/team-leads.yaml`, `pages/team-detail.yaml`, `api/team-detail.yaml`, migration `0.0.33`, and `test/crm_team_leads.integration.test.ts`.
- The slice provides team-scoped list and kanban views, stage/salesperson filtering, create/edit/assign actions, active-team and team-member guards, closed/stale/missing-row handling, deterministic fixture rows, migration replay, and file-backed restart persistence.

## Verification

Run from `sdk/bun/sample`:

```text
bun test test/crm_team_leads.integration.test.ts
```

The test also checks page/API discovery and the team-detail stat binding. Browser visual parity is conditional: an authenticated Odoo tab was requested through BrowserSkill, but the shared user tab was already subject to an explicit borrow-confirmation flow in another session during this run. No visual-parity claim is made without a confirmed borrow.

## Remaining gaps

The source action's full Odoo lead form, activity/chatter/attachment workflow, and paired authenticated desktop/mobile screenshots remain covered by the existing lead-detail slices and open CRM parity gates. This evidence is a bounded feature record, not CRM sign-off.
