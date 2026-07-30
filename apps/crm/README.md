# Core3 CRM fixture

Standalone Odoo-style CRM UI fixture backed by DuckDB. TMS is not a dependency.

```sh
cd apps/crm
bun install
bun run dev
```

Open <http://localhost:3010>. The fixture includes the global app launcher,
CRM module navigation, pipeline kanban, leads/opportunities list and form,
activities, customers, teams, forecast/reporting, configuration, import, and
lead conversion/lost-reason workflows. Declarative app, model, view, action,
and menu metadata lives in [`module.yaml`](module.yaml).

The server uses `CRM_ROLE=salesperson` by default. Set `CRM_ROLE=manager` or
`CRM_ROLE=system` to run the manager-only assignment, archive, delete, merge,
import, and configuration workflows. For local browser smoke tests only,
`CRM_ALLOW_ROLE_HEADER=true` enables the simulated `?role=manager` workflow;
never enable it in production. View state is URL-backed, so browser
back/forward restores the active CRM view and search context.
Favorites are stored in browser local storage. Sales and Inventory are visible
in the app launcher as explicit Coming Soon modules.
