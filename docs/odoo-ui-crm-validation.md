# CRM Slice Validation

The fixture is intentionally validated as a browser workflow and DuckDB API,
not with a unit-test requirement.

## Commands

```sh
cd apps/crm
bun install
bun run build:css
bunx tsc --noEmit -p tsconfig.json
bun server.ts
```

Use `?role=salesperson` or `?role=manager` to verify permission differences.
The screen routes are `/?view=list`, `/?view=form&id=opp-001`, `/?view=graph`,
`/?view=pivot`, and `/?view=calendar`; the default route is the pipeline.

## Acceptance evidence

| Requirement | Evidence |
| --- | --- |
| YAML model/action/view/menu contract | `apps/crm/module.yaml` and `/api/crm/module` |
| Fluent markup | `lib/components/Odoo*.ts`, `lib/services/*`, and the CRM app contain no direct element construction or HTML injection |
| SCSS source/build | `apps/crm/styles.scss`, `package.json` `build:css`, generated `styles.css` |
| DuckDB read/write workflows | `apps/crm/database.ts`, `schema.sql`, `seed.sql`, and `/api/crm/*` |
| Desktop/narrow visual workflow | Pipeline, list, form, graph, pivot, calendar, and mobile browser captures |
| Permission boundary | Manager-only mutation operations return `403` for salesperson requests |
| Navigation and state | `lib/services/ActionRouter.ts`, URL-backed view/search state, and browser history listener |
| No TMS dependency | `apps/crm` has no TMS import or data dependency |
