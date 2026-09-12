# Odoo 19 UI parity — Field Service audit

Status: blocked — source addon unavailable; no parity implementation approved.

Audit date: 2026-09-12

## Odoo source audit

The requested sibling source path `../odoo` resolves to
`/home/nhanjs/projects/core3-worktrees/odoo` from this worktree and is absent.
The available Odoo checkout is `/home/nhanjs/projects/odoo`, branch `19.0`,
revision `659759969d535d286b656c96b675e4612b925ddd`. The requested addon is
also absent there:

- `/home/nhanjs/projects/odoo/addons/industry_fsm/`
- Consequently there is no local `/home/nhanjs/projects/odoo/addons/industry_fsm/__manifest__.py`.
- There are no local `industry_fsm` `models/`, `views/`, `security/`, `data/`,
  `demo/`, or `static/` paths to inspect.

A directory search across `/home/nhanjs/projects` and `/home/nhanjs` found no
other local checkout containing an `industry_fsm` directory. The available
checkout contains only unrelated translated module metadata references such as
`base.module_industry_fsm`; those references do not provide the addon manifest,
menu tree, views, demo data, or assets required for a UI audit.

The parent register remains accurate: `field-service` maps to `industry_fsm`,
source status is unavailable in the supplied source, and implementation status
is `planned` in
`sdk/bun/sample/plan/odoo-ui-parity-plan.md`.

## Current Core3 ownership

Core3 has an existing, non-parity Field Service domain boundary at
`sdk/bun/sample/services/field-service/`:

- `manifest.yaml` owns the Core3 menu entry `/field-service`, the `Field
  Service` application label, the `Operations` group, and the `Field Tasks`
  item.
- `pages/tasks.yaml` owns page id `field-service`, a `ListView`, an embedded
  `field_service_tasks` query, create-form action YAML, and task transitions.
- `pages/task-detail.yaml` owns page id `field-service-task-detail` and an
  `OdooFormView` for one task.
- `pages/field-service-workflow.yaml` owns the `field_service_tasks` state
  machine and transition guards.
- `migrations/20260819090000-001-field-service.yaml` owns the
  `field_service_tasks` table; the follow-up demo migration owns one stable-id
  `field-task-demo-001` row, but its `scheduled_date` uses `CURRENT_DATE + 1`
  and is therefore date-relative rather than fully deterministic.
- `permissions.yaml` owns `field-service.read`, `field-service.write`, and
  `field-service.manage`.
- `storage.yaml` selects DuckDB and local uploads.
- `sdk/bun/sample/config.yaml` enables the Core3 module and repeats its Core3
  route as `/field-service`.

This boundary is not evidence of Odoo parity. It currently uses Core3-specific
task labels and workflow behavior, has no Odoo menu/action/view inventory, and
has no Field Service-specific browser capture or focused test suite. Its page
YAML also embeds datasource queries, while the shared parity contract requires
page-matched API fragments under `services/<module>/api/`; that contract repair
must be planned separately after the Odoo source inventory exists.

### Contract audit evidence

The current files expose the following contract without asserting Odoo
equivalence:

| Concern | Current declaration | Audit result |
| --- | --- | --- |
| Route/page | `/field-service`, page ids `field-service` and `field-service-task-detail` | Discovered by the shared audit; source ownership is Core3-only |
| Read boundary | `field-service.read` on menu, pages, and datasources | Declared in YAML; no Odoo visibility group can be compared |
| Write boundary | `field-service.write` for create/assign/start/complete | Declared in YAML; no source-backed workflow parity established |
| Management boundary | `field-service.manage` for cancel | Declared in YAML; no source-backed admin boundary established |
| API separation | No `services/field-service/api/` directory; queries/actions remain in `pages/tasks.yaml` and `pages/task-detail.yaml` | Does not meet the current page/API separation contract |
| Fixture | Stable task id `field-task-demo-001` | Present, but scheduled date is date-relative |
| Browser evidence | No Field Service-specific authenticated capture | Not claimed or created |

Validation evidence for this audit:

- `cd sdk/bun/sample && bun run audit` passed: 647 pages, 662 routes, and
  1112 datasources; the shared audit reported every discovered page has a
  supported component and route.
- `cd sdk/bun/packages/client && bun run test -- --run
  test/cases/yaml-schema.test.ts test/cases/service-schema.test.ts` ran 21
  tests: the 16-test YAML schema suite passed, while the pre-existing service
  schema suite failed one invalid nested-database assertion. This is unrelated
  to the Field Service files and is not presented as a Field Service pass.
- `git diff --check` passed.

## Why UI cloning cannot truthfully proceed

The required parity gate cannot be completed without the exact addon source:
the Odoo application/menu hierarchy, visibility groups, action contexts, view
architectures, labels, responsive behavior, official demo-data declaration,
and required assets are all unverified. Treating the existing Core3 task list
or generic Odoo component names as those Odoo facts would invent labels, routes,
screens, or visual evidence. No Odoo/Core3 browser comparison or screenshot is
claimed for this audit, and no capture was created.

## Dependency and next gate

Provide a matching Odoo 19 source checkout containing
`addons/industry_fsm/`, or install/enable the exact addon in the local Odoo
reference environment and make its source available for inspection. The next
gate is then:

1. Record the addon manifest/version and demo-data declaration.
2. Extract the exact visible Odoo menu tree, actions, groups, view modes,
   labels, routes/action contexts, and desktop/mobile states from source and
   the authenticated reference environment.
3. Map that inventory to Core3 ownership and decide whether the existing
   boundary is retained, split, or replaced.
4. Only after approval, implement one bounded slice with page/API YAML joined
   by `page.id`, deterministic seed fixtures, server-side permissions, focused
   contract tests, and authenticated desktop/mobile captures under
   `/tmp/core3-odoo-parity`.

Until that dependency is satisfied, keep this sub-plan blocked and the parent
register status `planned`.
