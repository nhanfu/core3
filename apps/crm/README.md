# Core3 CRM fixture

Standalone Odoo-style CRM UI fixture backed by DuckDB. TMS is not a dependency.

```sh
cd apps/crm
bun install
bun run dev
```

Open <http://localhost:3010>. The current slice includes the CRM shell, pipeline
kanban, leads/opportunities list, and opportunity form. Declarative model,
view, action, and menu metadata lives in [`module.yaml`](module.yaml).

Use `?role=manager` to exercise manager-only assign, archive, delete, and bulk
actions. View state is URL-backed, so browser back/forward restores the active
CRM view and search context. Favorites are stored in browser local storage.
