# Inventory detailed QA test plan

Module: inventory  
QA owner: inventory-qa  
Developer owner: inventory module owner  
Reference addon/version: stock, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`inventory.md`](../../inventory.md); executed evidence is
recorded in [`../inventory.md`](../inventory.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Transfers | receipts/deliveries, internal transfers and detail routes | Picking CRUD, edit persistence, confirm/check/validate workflow, move completion and Put in Pack package creation |
| Products/locations | locations, lots/serials, packages, package transfers, warehouses and operation types | Hierarchy, lot/package/warehouse CRUD, package-to-transfer drill-down, archive and relation guards |
| Operations | replenishment, physical inventory and scrap routes | Counts, replenishment actions, scrap lifecycle and stale guards |
| Reporting/settings | moves history, stock report and settings routes | Graph/pivot/list filters, manager settings and read-only report boundaries |

Actors are Inventory Manager, Inventory User, warehouse operator, Fleet
ordinary user, wrong-company user and unauthenticated user. Fixtures use stable
warehouses, locations, products, lots, packages, pickings, moves, scrap rows
and report records. Mutations use isolated databases and deterministic IDs;
transfer workflows must preserve row versions and move quantities.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| INV-FUNC-001 | Transfers | Search/filter/detail, edit fields, confirm/check/validate and reload persistence work | pass: focused suite and authenticated workflow |
| INV-FUNC-002 | Locations/warehouses | Hierarchy, CRUD, archive/restore, validation, duplicate, in-use and stale guards work | pass: focused suite |
| INV-FUNC-003 | Lots/packages | Scoped list/detail, quantity/location validation, CRUD and safe delete preserve relations | pass: focused suite; package transfer drill-down and browser evidence |
| INV-FUNC-004 | Operations | Replenishment, physical counts and scrap actions validate quantities/state and persist | pass: focused suite |
| INV-FUNC-005 | Reporting/settings | Move history, stock report and settings expose declared read-only/filter/save contracts | pass: focused suite |
| INV-FUNC-006 | Empty/error/not-found | Empty, missing, forbidden and transport-error states are explicit for every datasource | pass: focused suite |
| INV-FUNC-007 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate stock records or moving dates | planned migration/restart gate |
| INV-FUNC-008 | Attachments/import/export/print | Exercise transfer documents, product/lot import/export and exposed report/print actions | planned browser interaction gate |
| INV-FUNC-009 | Put in Pack | Create package, contents, result relation, timeline and picking row-version update; reject stale/duplicate/invalid requests and survive restart | pass: `INV-PACK-001` focused suite and Core3 browser |
| INV-FUNC-010 | Annual inventory settings | Day/month defaults 31/12, manager save, stale/missing guards, idempotent migration and restart persistence | pass: `INV-SETTINGS-001` focused suite |
| INV-FUNC-011 | Stock report Inventory at Date | Date wizard persists company context, filters report rows, handles invalid dates, and survives restart | pass: `INV-STOCK-AT-DATE-001` focused suite |
| INV-FUNC-012 | Operations Types lifecycle | Create/edit/archive/restore operation types with durable row versions, source/destination locations, validation, and restart persistence | pass: `INV-OP-TYPES-001` focused suite |
| INV-FUNC-013 | Scrap validation Product Move | Draft Scrap validation sets Done/date, persists one Product Move relation, and exposes it on the detail page | pass: `INV-SCRAP-001` bounded suite; shared discovery boundary recorded |
| INV-FUNC-014 | On Hand quant relocation | Manager relocates a positive quant to an active internal location, preserves lot/quantity metadata, and records a durable relocation audit and move line | pass: `INV-PHYSICAL-RELOCATE-001` focused suite |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| INV-WF-001 | Receipt/delivery lifecycle | Draft → Waiting → Ready → Done updates picking/moves atomically and rejects stale/cancelled actions | pass: authenticated workflow probe |
| INV-WF-002 | Transfer edit | Details edit posts through mutation transport and survives reload | pass: authenticated browser probe |
| INV-WF-003 | Inventory count/replenishment | Count and replenishment actions update quantities with validation and row-version guards | pass at contract level |
| INV-WF-004 | Scrap/packages/lots | Scrap, lot and package relations remain consistent and scoped to the operation | pass at contract level; browser workflow planned |
| INV-WF-006 | Package transfers | Package stat resolves only pickings linked through source/result package move-line relations and opens shared transfer detail | pass: 3 tests / 22 assertions and authenticated Core3 desktop/mobile evidence; Odoo group-gated |
| INV-WF-007 | Put in Pack | Ready/Waiting transfer opens the package form, persists package/type/content/relation, records timeline, and reloads without losing state | pass: `INV-PACK-001` Core3 desktop/mobile; Odoo action gated for reference user |
| INV-WF-005 | Durable/external boundary | Carrier, barcode, accounting and cross-module callbacks use Temporal when durable; retry, replay, restart and compensation are tested | planned |
| INV-WF-008 | Operation type configuration | Create/edit/archive/restore preserves operation-type settings and blocks archive while open transfers reference the type | pass: `INV-OP-TYPES-001` focused suite; Core3 browser lifecycle evidence |
| INV-WF-009 | Scrap validation | Validate a current Draft Scrap Order, persist its stock move side effect, expose Product Moves, reject duplicate/stale/done transitions, and survive restart | pass: `INV-SCRAP-001` focused suite and authenticated evidence |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| INV-PERM-001 | Inventory Manager | Configuration, transfer, count and stock mutations succeed | planned browser actor gate |
| INV-PERM-002 | Inventory User/operator | Assigned warehouse reads and permitted operations work within scope | planned |
| INV-PERM-003 | Fleet ordinary user | Transfer/configuration writes return 403 and do not change rows | pass: authenticated confirm boundary |
| INV-PERM-004 | Wrong company | Warehouses, locations, products, lots, pickings and reports are not leaked or mutable | planned |
| INV-PERM-005 | Unauthenticated/expired | Redirect/401/403 without protected response data | planned |
| INV-PERM-006 | Stale/missing/invalid | 409/404/422 leaves current inventory rows and moves unchanged | pass: focused suite |
| INV-PERM-007 | Put in Pack action | `inventory.write` required; stale row, already-packed, blank/duplicate reference, no-lines and invalid-state requests are rejected without partial package state | pass: `INV-PACK-001` focused suite |
| INV-PERM-008 | Annual settings manager boundary | `inventory.manage` is required for the Settings page and mutation; read-only users receive 403 and rows remain unchanged | pass: `INV-SETTINGS-001` focused runtime test |
| INV-PERM-009 | Stock report date context | `inventory.read` is required for the report/context; wrong-company date requests return 403 without a run | pass: `INV-STOCK-AT-DATE-001` focused runtime test |
| INV-PERM-010 | Operations Types manager boundary | `inventory.manage` is required for list/detail and create/edit/archive/restore; read-only users receive 403 without mutation | pass: `INV-OP-TYPES-001` focused runtime test |
| INV-PERM-011 | Scrap Orders operator boundary | `inventory.read` permits list/detail/moves; `inventory.write` is required for create/edit/validate/delete and read-only users receive 403 | pass: `INV-SCRAP-001` focused runtime test |
| INV-FUNC-014 | Physical Inventory Apply All | Apply All accepts reason/date, applies only counted quants, persists an audit run, and records non-zero move history | pass: `INV-PHYSICAL-001` focused lifecycle test |
| INV-WF-010 | Physical Inventory Apply All workflow | counted-only adjustment, empty-set/invalid-input guards, deterministic audit identifier, and file-backed restart persistence | pass: `INV-PHYSICAL-001` focused lifecycle test |
| INV-PERM-012 | Physical Inventory adjustment boundary | `inventory.read` permits the page; `inventory.write` is required for Apply All and read-only users receive 403 without mutation | pass: `INV-PHYSICAL-001` focused runtime test |
| INV-FUNC-015 | Moves Analysis report | `stock.move` report exposes source columns, default Done state, state/type/date/search filters, list/pivot/graph/kanban/form states, and traceable detail | pass: `INV-MOVES-ANALYSIS-001` focused lifecycle test |
| INV-WF-011 | Moves Analysis read-only report | pivot aggregation, detail navigation, empty/404/503 states, no CRUD mutation, and restart-stable fixtures | pass: `INV-MOVES-ANALYSIS-001` focused lifecycle test |
| INV-PERM-013 | Moves Analysis report boundary | `inventory.read` is required for list/detail and direct API access; no write/manage action is exposed | pass: `INV-MOVES-ANALYSIS-001` focused runtime test |
| INV-PERM-014 | On Hand relocation manager boundary | `inventory.read` permits the On Hand list; `inventory.manage` is required for Relocate and ordinary readers receive 403 without mutation | pass: `INV-PHYSICAL-RELOCATE-001` focused runtime test |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| INV-UI-001 | Transfers/detail | 1440x900, 390x844 | Menu order, statusbar, move lines, forms and responsive layout match Odoo | route matrix pass; paired comparison partial |
| INV-UI-002 | Products/locations/configuration | both | List/form/kanban, hierarchy, settings and validation states match Odoo | package transfers paired Core3 evidence; remaining surfaces planned |
| INV-UI-003 | Operations/reports | both | Replenishment, counts, scrap and graph/pivot/list reports match Odoo | planned paired capture |
| INV-UI-004 | Current route regression | all 24 registered routes | Authenticated desktop/mobile checks have no blank/redirect, page/request error or horizontal overflow | pass: 48-check matrix |
| INV-UI-005 | Put in Pack transfer dialog | 1440x900, 390x844 | Permissioned transfer action, package reference/type form, timeline/package result and responsive no-overflow state are rendered | pass Core3; Odoo reference control gated |
| INV-UI-006 | Package Transfers stat/list | 1440x900, 390x844 | Package stat opens the scoped transfer list, source/result relation labels render, row navigation works, and no horizontal overflow occurs | pass Core3; Odoo reference package menu group-gated |
| INV-UI-007 | Annual Inventory Day and Month | 1440x900, 390x844 | Number/select controls, Save/reload persistence, no request errors or horizontal overflow; paired Odoo result is recorded | pass Core3; Odoo action RPC blocker captured |
| INV-UI-008 | Stock report Inventory at Date | 1440x900, 390x844 | Date form opens, selected context is visible, report refreshes/reloads without overflow; paired Odoo wizard result is recorded | pass Core3; Odoo mobile control boundary captured |
| INV-UI-009 | Operations Types list/detail | 1440x900, 390x844 | New modal, list/detail fields, edit/reload, source location labels, and responsive states render; paired Odoo result or exact blocker is recorded | pass Core3; Odoo action blocker captured |
| INV-UI-010 | Scrap Orders list/detail/Product Moves | 1440x1000, 390x844 | Draft/Done form, Validate action, Product Moves relation, desktop/mobile list/detail, and paired Odoo list/kanban comparison are captured | pass Core3/Odoo evidence; repository discovery boundary remains partial |
| INV-UI-011 | Physical Inventory list/Apply All wizard | 1440x1000, 390x844 | Physical Inventory list, Apply All reason/date modal, counted-only result, responsive route, and paired Odoo list comparison are captured | pass Core3/Odoo evidence; residual conflict/reset/relocation semantics remain |
| INV-UI-012 | Moves Analysis report modes | 1440x1000, 390x844 | Core3 list/pivot/detail/mobile report and Odoo pivot/list/mobile kanban show source-backed report modes with no request errors or horizontal overflow | pass Core3/Odoo evidence; broader actor/company matrix remains |
| INV-UI-013 | On Hand relocation wizard | 1440x900, 390x844 | Authenticated manager sees On Hand Relocate modal and completed location move on desktop; mobile On Hand remains usable without overflow; paired Odoo Locations/On Hand source surface is captured | pass Core3/Odoo evidence; no Odoo mutation |

## Exit criteria

Full Inventory sign-off requires the focused suite, authenticated CRUD and
transfer/operation workflows, all actor boundaries, reload/restart persistence,
complete paired Odoo desktop/mobile comparisons, and a migration-contract
decision. Current route, Settings, and transfer evidence is conditional only.
