# YAML-first lead-management refactor

## Objective

Replace the current multi-feature CRM with a single lead-management slice whose server and client are both driven by YAML. Generic transport, query binding, rendering, and event execution must contain no lead-specific business logic.

## Scope and non-negotiable architecture

- The only enabled product feature is lead management: list, create, read, update, and delete leads.
- `apps/crm/db/leads.yaml` is the only backend CRM definition for this slice. It owns the `Leads` resource schema, permission declarations, datasource definitions, SQL, and any YAML-embedded business logic.
- The generic server derives endpoints from resource metadata; it must not register a lead-specific route or dispatch table.
- The public API is OData-shaped:
  - `POST /api/odata/Leads` creates a lead.
  - `GET /api/odata/Leads` lists leads.
  - `GET /api/odata/Leads('<id>')` reads one lead.
  - `PUT /api/odata/Leads('<id>')` updates one lead.
  - `DELETE /api/odata/Leads('<id>')` deletes one lead.
- `GET` supports `$filter`, `$orderby`, `$groupby` or compatible `$apply`, `$select`, `$top`, `$skip`, `$count`, and `$search`, subject to YAML-declared field permissions. Binding remains parameterized and identifiers come only from declared fields.
- Client screen definitions live in client YAML (for example, `apps/crm/screens/leads.yaml`). They declare component type, layout, fields, datasource IDs, data bindings, and events. Event code, if needed, belongs in the YAML definition rather than handwritten screen code.
- The client runtime may only load YAML, render declared component types, resolve bindings, make generic datasource requests, manage generic state, and execute declared events. It must not contain lead-specific conditions, field lists, routes, or API calls.

## Phase 1: remove non-lead functionality

1. Inventory every route, menu, datasource, YAML document, schema/seed table, UI function, and smoke assertion currently used solely by pipeline, activities, customers, teams, reporting, forecast, configuration, import, chatter, attachments, conversion, merge, and other non-CRUD workflows.
2. Remove those features completely, including their navigation and API surface. Do not leave compatibility route tables or hidden placeholders.
3. Retain only data required to persist and display a lead. Reduce seed data to the minimum needed for browser/API validation.
4. Keep generic framework primitives in `apps/lib`; do not move CRM behavior into shared components.

## Phase 2: backend convergence

1. Move the lead resource declaration from `apps/crm/db/resources/leads.yaml` into `apps/crm/db/leads.yaml`, then remove the separate resource file.
2. Collapse all lead CRUD behavior into four YAML datasources. There are four CRUD operations (not three): `create`, `read`, `update`, and `delete`.
3. Ensure the generic OData router selects the datasource from YAML based only on HTTP method, resource name, and key presence. Add `PUT` update support; do not require the old CRM action gateway.
4. Delete `apps/server.ts` CRM-specific operation registration and the `/api/crm?entity=&action=` contract. Keep only generic OData routing, static application serving, error handling, and runtime setup.
5. Delete unused CRM operation/service YAML files and datasource route support once no generic consumer requires them.
6. Make OData list query construction validate fields against the resource definition and bind all values. Reject unsupported expressions rather than treating them as SQL.

## Phase 3: client YAML engine and lead screens

1. Define a compact screen YAML contract with screen identity and route; component tree and properties; datasource bindings; form fields and record bindings; event declarations and optional embedded JavaScript; navigation and refresh actions.
2. Implement a generic YAML loader and renderer in the client. Expose only generic primitives such as list, form, button, input, text, container, and error/loading states.
3. Implement generic OData datasource binding from YAML datasource IDs to the OData resource operation. Screen YAML, not the renderer, chooses which datasource is invoked.
4. Implement a lead-list screen with search, declared OData ordering/filtering, selection, and a create action.
5. Implement a lead-form screen for read/create/edit/delete, with all record fields and save/delete events defined in YAML.
6. Remove handwritten lead render functions and direct `odata('leads', ...)` calls from `apps/crm/app.ts`. Its remaining responsibility is app bootstrap and generic engine startup only.

## Phase 4: acceptance gates

1. Start the app with a fresh temporary `CRM_DB_PATH` and a non-conflicting port.
2. Verify the OData metadata and all CRUD methods, including `PUT` and `DELETE`.
3. Verify each supported GET option, combinations of filter/order/paging, and rejection of invalid fields and expressions.
4. Run an end-to-end browser workflow: load list, search/filter/order, open a record, create it, update it, delete it, and confirm the resulting list.
5. Run TypeScript validation, rebuild CRM CSS if SCSS changed, and run the browser smoke script. Treat successful compilation alone as insufficient.

## Phase 5: restore capabilities

Restore the former CRM surface in these independently verifiable YAML slices:

1. Customers and sales teams: CRUD, lead relations, and customer/team drill-downs.
2. Lead pipeline: stages, kanban, conversion/loss, archive/restore, assignment, duplicates, merge, and lead activities.
3. Collaboration: messages, followers, and attachments, including file validation and download authorization.
4. Configuration: stages, tags, lost reasons, activity types/plans, recurring plans, and access rules.
5. Reporting: lead, pipeline, activity, forecast, graph, pivot, calendar, grouping, and drill-down screens.
6. Import: CSV preview, validation, commit, relation resolution, and import history.

Each restored feature must add its backend resource/datasources to the server-private `apps/crm/db/leads.yaml` and client composition/events to `apps/crm/screens/*.yaml`. Changes to generic engines require an explicit capability reason and shared validation; no feature-specific route or renderer code is permitted.

## Completion evidence

The restored CRM inventory is now represented by OData entity sets in the one
backend definition: Leads, Customers, Teams, Activities, Stages, Imports,
Messages, Followers, Attachments, and Catalogs. Client YAML defines the lead,
pipeline, collaboration, customer, team, activity, configuration, reporting,
forecast, pivot, calendar, and import routes.

The fresh-database smoke suite verifies OData metadata, safe query options,
legacy gateway removal, CRUD for each core entity, protected lead actions,
stage movement, conversion, archive/restore, merge, import preview/commit,
collaboration resources, catalog CRUD, and every rendered screen route.

Validated commands:

```text
cd apps && bun run build:css
bunx --bun tsc -p apps/tsconfig.json --noEmit
cd apps && bun run test:browser
git diff --check
```
