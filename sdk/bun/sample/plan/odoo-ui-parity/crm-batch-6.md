# CRM parity batch 6: Sales Teams configuration action

Status: `implemented`

This bounded slice exposes the source-backed Odoo configuration action
`sales_team.crm_team_action_config` under `CRM > Configuration > Sales Teams`.
It does not create a second team model or duplicate the existing pipeline team
page. The existing CRM-owned `teams` page is the shared list/detail contract;
`/teams` remains the Sales menu alias for `crm_team_action_pipeline`, while
`/crm/teams` is the configuration menu alias for `crm_team_action_config`.

## Source contract

The authoritative source is
`/home/nhanjs/projects/odoo/addons/sales_team/views/crm_team_views.xml`:

- action: `crm_team_action_config`, model `crm.team`, view modes `list,form`,
  empty context;
- list fields: sequence handle, team name, active (hidden), team leader, and
  company when multi-company access is enabled;
- search: team name, team leader, members, `Archived` filter, and company/team
  leader groupings;
- menu: `CRM > Configuration > Sales Teams`, visible to the sales manager
  boundary.

Core3 keeps the CRM manager permission on the menu and mutations, while CRM
read remains required to render the shared list/detail page. Active and
archived filtering and name/leader search are now declared at the CRM-owned
datasource boundary. The previous cross-module `/crm/teams` menu entry in the
Sales manifest was removed so this action has one owning menu and no duplicate
route registration.

## Evidence and coverage

The focused test `test/sales_teams_configuration.integration.test.ts` covers
the page/API join, both route aliases, manager CRUD, duplicate alias/name
guards, lead relation updates on rename, archive state, active search, empty
archived results, and permission declarations. Fixtures remain CRM-local and
deterministic; no migration was required because the team schema and seeded
relations already exist in the CRM migration chain.

Authenticated browser screenshots are required at 1440x900 and 390x844 under
`/tmp/core3-odoo-parity/crm-batch6-20260912/`. The Odoo CRM addon was not
mutated for this batch; any unavailable Odoo reference surface is recorded as
a limitation rather than claimed as visual parity.
