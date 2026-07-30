# CRM Slice Validation

The fixture is intentionally validated as a browser workflow and DuckDB API,
not with a unit-test requirement.

## Commands

```sh
cd apps/crm
bun install
bun run build:css
bunx tsc --noEmit -p tsconfig.json
bun run test:browser
bun ../server.ts
```

Use `?role=salesperson`, `?role=manager`, or `?role=system` to verify
permission differences. The screen routes include `/?view=list`,
`/?view=form&id=opp-001`, `/?view=activities`, `/?view=customers`,
`/?view=teams`, `/?view=reporting`, `/?view=forecast`,
`/?view=settings`, and `/?view=import`; the default route is the pipeline.

## Acceptance evidence

| Requirement | Evidence |
| --- | --- |
| YAML model/action/view/menu contract | `apps/crm/module.yaml` and `/api/crm/module` |
| Fluent markup | `apps/lib/components/Odoo*.ts`, `apps/lib/services/*`, and the CRM app contain no direct element construction or HTML injection |
| SCSS source/build | `apps/styles.scss`, `apps/crm/package.json` `build:css`, generated `apps/styles.css` |
| DuckDB read/write workflows | `apps/crm/database.ts`, `schema.sql`, `seed.sql`, and `/api/crm/*` |
| Desktop/narrow visual workflow | `apps/crm/scripts/browser-smoke.ts` via `bun run test:browser`, plus framework calendar/dialog tests |
| Permission boundary | `apps/crm/test/api.test.ts` plus server-side `canAccess*` checks return `403` or scoped data |
| Navigation and state | `apps/lib/services/ActionRouter.ts`, `ActionService`, URL-backed view/search state, and browser history listener |
| No TMS dependency | `apps/crm` has no TMS import or data dependency |
| Global module switching | `AppRegistry`, `AppLauncher`, YAML `apps`, `/api/modules`, and CRM/Sales/Inventory launcher workflow |
| CRM lifecycle/config/import | `/api/crm/leads/:id/convert`, `/lost`, `/duplicates`, `/merge`, `/config`, `/stages`, and `/import/*`, including persisted validation errors |
| Reporting dimensions | `/api/crm/report/summary`, `/api/crm/report/analysis?dimension=stage|salesperson|team|customer|closing_bucket`, activity analysis, and report drill-down endpoints |
