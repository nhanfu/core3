# Manufacturing detailed QA test plan

Module: manufacturing  
QA owner: manufacturing-qa  
Developer owner: manufacturing module owner  
Reference addon/version: mrp, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-21

This plan follows [`manufacturing.md`](../../manufacturing.md); executed
evidence is recorded in [`../manufacturing.md`](../manufacturing.md).

## MANUFACTURING-PRODUCTION-PLANNING-001

| Case | Class | Setup / actor | Action or route | Expected / persistence | Evidence |
| --- | --- | --- | --- | --- | --- |
| MRP-PP-001 | functional | Durable Manufacturing fixtures; `manufacturing.read` | Discover `/manufacturing/production-planning` | Page/API join by `manufacturing-production-planning`; List/Form/Calendar/Pivot/Graph and no create/delete | focused integration test |
| MRP-PP-002 | data | Active and terminal MOs; read actor | Query with defaults, cleared defaults, work-center and search filters | Defaults return Ready/Progress/Blocked; cleared query excludes terminal productions | focused integration test |
| MRP-PP-003 | workflow/permission | Admin and denied actor | Inspect Plan/Start/Pause/Continue/Block/Cancel | Mutations require `manufacturing.write`, use `mrp_workorders`, and retain CAS/state guards | API assertions |
| MRP-PP-004 | data/regression | File-backed DuckDB | Migrate twice, close/reopen, query again | Index/migrations are idempotent and rows persist after restart | focused integration test |
| MRP-PP-005 | responsive/visual | Shared authenticated BrowserSkill Odoo tab | Borrow existing tab at 1440x900 and 390x844 | Borrow did not complete; case is blocked and carries no visual pass | blocker record |

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Manufacturing Orders | `/manufacturing/orders`, detail and overview routes | MO CRUD, components, operations, moves and lifecycle states |
| Work Orders/Centers | work-orders, work-center, operations, loads and performance routes | Operator workflow, work-center configuration, scoped stat actions and productivity |
| Bills of Materials | `/manufacturing/boms`, detail and overview routes | BoM CRUD, components, operations and product links |
| Products and reporting | product/variant, scrap, unbuild, OEE and productivity routes | Catalog CRUD, scrap/unbuild workflows, graph/pivot/list reports and settings |

Actors are Manufacturing Manager, Manufacturing User/operator, ordinary user,
wrong-company user and unauthenticated user. Fixtures use stable products,
variants, BoMs, manufacturing orders, work orders, work centers, moves, scrap,
unbuild and report rows. Mutations use isolated databases and deterministic
IDs/dates.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| MRP-FUNC-001 | Manufacturing orders | Search/filter/detail, create/edit, component/move projections and validation use persisted data | pass: focused suite |
| MRP-FUNC-002 | Work orders | Operator actions, work-center scope, state transitions, pause/resume and stale guards persist | pass: focused suite and workflow probe |
| MRP-FUNC-003 | BoMs/products | BoM, product and variant CRUD, archive, duplicate and relation guards work | pass: focused suite |
| MRP-FUNC-004 | Scrap/unbuild | Create/edit/validate/unbuild actions enforce state, quantity and stale guards | pass: focused suite |
| MRP-FUNC-005 | Configuration | Work centers, operations, productivity losses and settings validate manager mutations | pass: focused suite |
| MRP-FUNC-006 | Reporting | OEE, work-order analysis/performance and load reports expose deterministic grouped read-only data | pass: focused suite |
| MRP-FUNC-007 | Empty/error/not-found | Missing, empty, forbidden and transport-error states are explicit for each datasource | pass at contract level |
| MRP-FUNC-008 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate MOs, work orders or moves | planned restart/migration gate |
| MRP-FUNC-009 | Attachments/import/export/print | Exercise exposed BoM/MO attachments, import/export and report/print actions | planned browser interaction gate |
| MRP-FUNC-010 | Work Orders action 649 existing-record edit | Open a non-terminal work order, edit operation/work center/duration/schedule, reload, and confirm persisted values; prove create/delete are not exposed by the Odoo action | planned bounded continuation |
| MRP-FUNC-011 | Work Centers Overview action | Persist dashboard metrics, derive work-order counts by work center, and preserve empty/transport/permission boundaries without CRUD controls | pass: focused suite |
| MRP-FUNC-012 | Work Center `action_work_orders` | Scope persisted non-terminal work orders to the selected work center across list/form/calendar/pivot/graph modes; keep create/delete absent and retain guarded operator actions | pass: focused bounded suite |
| MRP-FUNC-013 | BoM `action_mrp_routing_time` | Scope completed work orders to the selected BoM across graph/pivot/list/form/calendar; filter by operation/work center/search and persist the BoM scope through restart | pass: focused bounded suite |
| MRP-FUNC-014 | Work Center Waiting Availability | Scope durable Waiting work orders to the selected Work Center across list/form/calendar/pivot/graph; expose only the guarded Plan operator action | pass: focused bounded suite |
| MRP-FUNC-015 | Work Center Late Orders | Start from the Overview Late link, scope durable late non-terminal work orders to the selected Work Center across list/form/calendar/pivot/graph, and preserve guarded operator actions | pass: focused bounded suite |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| MRP-WF-001 | MO lifecycle | Draft → Confirmed → Planned/In Progress → Done or Cancelled updates MO/work-order versions atomically | pass at contract level |
| MRP-WF-002 | Work-order operator flow | Waiting → Ready → Progress/Paused → Ready/Blocked follows guards and rejects stale replay | pass: authenticated workflow probe |
| MRP-WF-003 | BoM consumption/moves | Component and finished moves remain linked to the MO and respect quantity/state validation | pass at contract level |
| MRP-WF-004 | Scrap/unbuild | Scrap and unbuild update inventory-facing relations without partial writes | pass at contract level; browser integration planned |
| MRP-WF-005 | Durable/external boundary | Scheduling, work-center callbacks, inventory/accounting integrations and notifications use Temporal when durable; retry, replay, restart and compensation are tested | planned |
| MRP-WF-006 | Work-order edit guards | Edit a non-terminal row with its current version; reject terminal rows, invalid duration/date range, missing rows, stale versions, and unauthorized actors without partial writes | planned bounded continuation |
| MRP-WF-007 | Work Center Work Orders workflow | Scoped Plan/Start/Pause/Continue/Block/Cancel actions reuse `mrp_workorders`, preserve row guards, and refresh the scoped durable source | pass: focused contract; browser blocked by reference profile |
| MRP-WF-008 | Waiting Availability planning | Waiting rows expose Plan, transition through the existing guarded workflow, and remain durable across migration replay/restart | pass: focused contract; browser action capture pending |
| MRP-WF-009 | Late Work Orders operator flow | Late rows reuse `mrp_workorders`; Plan/Start/Pause/Continue/Block/Cancel require `manufacturing.write`, preserve CAS guards, and refresh the scoped source | pass: focused contract; browser showed Plan/Cancel |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| MRP-PERM-001 | Manufacturing Manager | Configuration, MO, BoM and workflow mutations succeed | planned browser actor gate |
| MRP-PERM-002 | Manufacturing User/operator | Assigned reads and operator actions work within company/work-center scope | planned |
| MRP-PERM-003 | Ordinary user | Manufacturing write/settings actions return 403 and do not change rows | pass: permission probe |
| MRP-PERM-004 | Wrong company | Products, BoMs, MOs, work orders and reports are not leaked or mutable | planned |
| MRP-PERM-005 | Unauthenticated/expired | Redirect/401/403 without protected response data | planned |
| MRP-PERM-006 | Stale/missing/invalid | 409/404/422 leaves the current manufacturing row unchanged | pass at contract level |
| MRP-PERM-007 | Work Orders action 649 edit | Manufacturing write can edit a non-terminal work order; read-only/ordinary actors cannot invoke the mutation; create/delete remain unavailable | planned bounded continuation |
| MRP-PERM-008 | Work Centers Overview | Dashboard datasource and navigation actions require `manufacturing.read`; no mutation action is exposed by the create-disabled source action | pass: focused suite |
| MRP-PERM-009 | Work Center Work Orders | Scoped reads require `manufacturing.read`; operator mutations require `manufacturing.write`; no create/delete action is exposed | pass: focused contract |
| MRP-PERM-010 | BoM Operations Performance | Report and filter datasources require `manufacturing.read`; the record-scoped action exposes no write/create/delete path and declares 401/403/503 responses | pass: focused contract |
| MRP-PERM-011 | Waiting Availability | Scoped reads require `manufacturing.read`; Plan requires `manufacturing.write`; create/delete remain unavailable | pass: focused contract |
| MRP-PERM-012 | Late Work Orders | Scoped reads require `manufacturing.read`; operator actions require `manufacturing.write`; create/delete remain unavailable | pass: focused contract |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| MRP-UI-001 | MO/work-order/operator | 1440x900, 390x844 | Menus, statusbars, work-center cards, forms and operator controls match Odoo | route smoke pass; paired comparison pending |
| MRP-UI-002 | BoM/product/scrap/unbuild | both | Forms, component/operation grids, dialogs and validation states match Odoo | planned paired capture |
| MRP-UI-003 | Reports/configuration | both | Graph/pivot/list, settings and configuration forms match Odoo | planned paired capture |
| MRP-UI-004 | Current route regression | all 32 registered routes | Authenticated desktop/mobile checks have no blank/redirect, page/request error or horizontal overflow | pass: 64-check matrix |
| MRP-UI-005 | Work Orders edit form | Odoo action 649 list/detail/edit state | 1440x900 and 390x844 | Work Order form exposes Edit for non-terminal rows, preserves visible tabs/status, saves without overflow, and reload shows the persisted change | planned bounded continuation |
| MRP-UI-006 | Work Centers Overview Kanban/Form | `/manufacturing/work-centers-overview` | 1440x900 and 390x844 | Dashboard cards expose status, work-order counts, OEE/load metrics, and guarded navigation without overflow | blocked: Core3 auth and Odoo MRP menu unavailable in shared profile |
| MRP-UI-007 | Work Center Work Orders scoped action | `/manufacturing/work-centers/work-orders` | 1440x900 and 390x844 | Source modes and selected-center rows render without overflow; paired Odoo capture is required where the reference action is available | blocked: shared Odoo profile redirects to Discuss and exposes no Manufacturing menu |
| MRP-UI-008 | BoM Operations Performance stat action | `/manufacturing/boms/detail/operations-performance` | 1440x900 and 390x844 | Operations Performance stat action and graph/pivot/list/form/calendar tabs match Odoo where the reference action is available; no overflow | blocked: shared Odoo profile redirects `/odoo/boms` to Discuss and exposes no Manufacturing menu |
| MRP-UI-009 | Work Center Waiting Availability | `/manufacturing/work-centers/waiting-availability` | 1440x900 and 390x844 | Work Center-scoped Waiting row, visible List/Calendar/Pivot/Graph tabs, Plan action, and no overflow; paired Odoo capture required where action is available | conditional: Core3 pass; Odoo reference redirects to Discuss |
| MRP-UI-010 | Work Center Late Orders | `/manufacturing/work-centers/late-orders` | 1440x900 and 390x844 | Overview Late navigation, selected-center late rows, visible List/Form/Calendar/Pivot/Graph tabs, guarded actions, and no overflow; paired Odoo capture required where the reference action is available | conditional: Core3 captures pass; Odoo reference redirects to Discuss |

## Exit criteria

Full Manufacturing sign-off requires the focused suite, authenticated CRUD and
MO/work-order/scrap/unbuild workflows, all actor boundaries, reload/restart
persistence, and paired Odoo desktop/mobile comparisons. Current route,
workflow and permission evidence is conditional progress only.
