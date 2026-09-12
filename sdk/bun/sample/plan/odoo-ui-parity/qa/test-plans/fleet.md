# Fleet detailed QA test plan

Module: fleet  
QA owner: fleet-qa  
Developer owner: fleet module owner  
Reference addon/version: fleet, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`fleet.md`](../../fleet.md); executed evidence is recorded
in [`../fleet.md`](../fleet.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Vehicles | `/fleet/vehicles`, vehicle detail/stat routes | Vehicle CRUD, archive/restore, driver changes, contracts, odometers and services |
| Reporting | costs, odometer and service analysis routes | Graph/pivot/list filters, grouping, scoped rows and empty/error states |
| Configuration | settings, manufacturers, models, categories, statuses, tags, service types, activity types | Manager CRUD, archive, relation-protected delete and settings validation |
| History and operations | assignment logs and service/contract action routes | Driver history, service lifecycle, contract renewal and vehicle-scoped actions |

Actors are Fleet Manager, Fleet User, ordinary user, wrong-company user and
unauthenticated user. Fixtures use stable vehicles, drivers, manufacturers,
models, statuses, tags, contracts, odometers, services and settings. Mutations
use isolated databases and generated IDs; timestamps and IDs must remain
deterministic.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| FLEET-FUNC-001 | Vehicles | List/detail search, filters, stats, create validation, and archive/restore preserve values after reload | pass: focused suite, create persistence test, and workflow probe; authenticated create/edit browser gate remains open |
| FLEET-FUNC-002 | Vehicle operations | Driver change, contracts, odometers and services are vehicle-scoped and guarded | pass: focused suite |
| FLEET-FUNC-003 | Configuration | Manufacturers, models, categories, statuses, tags, service types and activities support CRUD, validation and stale guards | pass: focused suite |
| FLEET-FUNC-004 | Reporting | Cost, odometer and service reports expose deterministic grouped graph/pivot/list data | pass: focused suite |
| FLEET-FUNC-005 | Settings | Fleet setting validates positive integer values and persists after reload | pass: focused suite |
| FLEET-FUNC-006 | Empty/error/not-found | Missing, empty, forbidden and transport-error states are explicit on every datasource | pass at contract level |
| FLEET-FUNC-007 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate fleet records or moving timestamps | planned restart/migration gate |
| FLEET-FUNC-008 | Attachments/import/export/print | Exercise exposed vehicle documents, import/export and report/print actions | planned browser interaction gate |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| FLEET-WF-001 | Vehicle archive lifecycle | Active → archived → restored updates row versions and prevents stale replay | pass: browser probe |
| FLEET-WF-002 | Driver assignment | Future driver change applies once, validates relation/date and rejects missing or stale vehicles | pass: focused suite |
| FLEET-WF-003 | Service lifecycle | Service activity states, costs and vehicle relations remain consistent through transitions | pass at contract level; browser workflow planned |
| FLEET-WF-004 | Contract/odometer stats | Vehicle stat actions return only linked records and counts update after mutation | pass at contract level |
| FLEET-WF-005 | Durable/external boundary | Reminders, service callbacks and cross-module integrations use Temporal when durable; retry, replay, restart and compensation are tested | planned |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| FLEET-PERM-001 | Fleet Manager | Configuration and vehicle administration mutations succeed | planned browser actor gate |
| FLEET-PERM-002 | Fleet User | Permitted vehicle reads/actions work within company scope | planned |
| FLEET-PERM-003 | Ordinary non-Fleet user | Fleet write/configuration actions return 403 and do not change rows | pass: archive boundary |
| FLEET-PERM-004 | Wrong company | Vehicles, drivers, contracts, services and reports are not leaked or mutable | planned |
| FLEET-PERM-005 | Unauthenticated/expired | Redirect/401/403 without protected response data | planned |
| FLEET-PERM-006 | Stale/missing/invalid | 409/404/422 leaves current fleet row unchanged | pass at contract level |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| FLEET-UI-001 | Vehicles/detail | 1440x900, 390x844 | Menu order, list/detail fields, stat buttons and responsive form match Odoo | route smoke pass; paired comparison pending |
| FLEET-UI-002 | Configuration | both | Settings, catalog forms, archive states and validation messages match Odoo | planned paired capture |
| FLEET-UI-003 | Reports/operations | both | Graph/pivot/list, histories, services and empty states match Odoo | planned paired capture |
| FLEET-UI-004 | Current route regression | all 28 registered routes | Authenticated desktop/mobile checks have no blank/redirect, page/request error or horizontal overflow | pass: 56-check matrix after isolated tag retest |

## Exit criteria

Full Fleet sign-off requires the focused corpus, authenticated vehicle/config
CRUD, lifecycle and stat workflows, all actor boundaries, reload/restart
persistence, and paired Odoo desktop/mobile comparisons. Existing route smoke,
archive/restore, and one permission probe are progress evidence only.
