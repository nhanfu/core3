# MovedX TMS visual and functional parity plan

## Objective and definition of done

Rebuild the MovedX tenant accessible through the supplied credentials as a
Core3 TMS. The target is **functional and visual parity** for every reachable
route, not a lookalike dashboard. Each page must use Core3 OOP components and
YAML page definitions; custom page code is permitted only for a documented
component adapter or domain action that cannot be declared yet.

Parity is complete only when every route in the page matrix has:

1. the same information architecture, permissions, primary/secondary actions,
   filters, columns, form fields, status transitions, and exports as the
   reference;
2. a Core3 YAML definition, server-authorized datasource/actions, database
   migrations, seed data, and automated interaction coverage;

This plan uses the reference tenant only for read-only inspection. Do not copy
its source, assets, or business data. Its labels, behaviour, and layout are the
acceptance baseline.

## Scope baseline: reference routes

The following table is the complete current route inventory from the read-only
reference audit. `List` means the standard resource-list shell described below;
`Detail` means a modal/drawer or routed editor launched from that list.

| Domain | Route | Reference page and required behavior | Primary Core3 recipe |
| --- | --- | --- | --- |
| Overview | `#/dashboard` | Period presets, KPI/action cards, charts, sortable top route/customer tables, CSV export | `DashboardLayout`, `PeriodPicker`, `MetricCard`, `EChart`, `DataGrid` |
| Operations | `#/orders` | Order list with draft/approval/cancel state, customer/date/shipment/route/mode/trips/total; detail and actions | `ResourceList`, `OrderEditor`, `LineItemGrid`, `ApprovalTimeline` |
| Operations | `#/chat` | Thread search, participant list, messages, attachments, composer | `ChatWorkspace`, `ThreadList`, `MessageTimeline`, `AttachmentInput` |
| Operations | `#/schedule` | Reference currently displays in-development state | `ComingSoon` with the identical shell and permission gate |
| Sales | `#/customers` | Customer CRM list/detail: lifecycle, owner, contacts, visibility | `ResourceList`, `CustomerEditor`, `ContactGrid`, `OwnerLookup` |
| Sales | `#/partners` | Partner/vendor list/detail with contacts and lifecycle | `ResourceList`, `PartnerEditor`, `ContactGrid` |
| Sales | `#/quotes` | Buy/sell quote, route/mode, validity, totals and profit | `ResourceList`, `QuoteEditor`, `MoneyLineItemGrid`, `StatusTimeline` |
| Sales | `#/crm/dashboard` | Company/team/employee/customer CRM metrics | `DashboardLayout`, `MetricCard`, `EChart`, `RankedGrid` |
| Sales | `#/crm/kpi` | Lead/conversion/care KPI reporting | `ResourceList`, `PeriodPicker`, `EChart`, `ExportMenu` |
| Accounting | `#/accounting/debit-notes` | Receivable document list, due date, paid/outstanding, status and Excel export | `ResourceList`, `FinancialDocumentEditor`, `ApprovalTimeline` |
| Accounting | `#/accounting/debit-note-summary` | Debit-note aggregation/report | `ReportLayout`, `PeriodPicker`, `EChart`, `SummaryGrid` |
| Accounting | `#/accounting/payment-requests` | Draft/approval/paid request workflow, payee, amount and detail lines | `ResourceList`, `FinancialDocumentEditor`, `ApprovalTimeline` |
| Accounting | `#/accounting/payment-request-summary` | Payment-request aggregation/report | `ReportLayout`, `PeriodPicker`, `EChart`, `SummaryGrid` |
| Accounting | `#/accounting/advances` | Employee advance workflow and outstanding balance | `ResourceList`, `FinancialDocumentEditor`, `SettlementLink` |
| Accounting | `#/accounting/settlements` | Advance settlement workflow with linked transactions | `ResourceList`, `FinancialDocumentEditor`, `ReconciliationGrid` |
| Accounting | `#/accounting/invoice-templates` | Invoice template list/editor | `ResourceList`, `TemplateEditor`, `TokenPicker` |
| Accounting | `#/accounting/ledger-accounts` | Chart-of-accounts master data | `TreeResourceList`, `MasterDataEditor` |
| HR | `#/hr/employees` | Employee directory/detail | `ResourceList`, `EmployeeEditor`, `AttachmentInput` |
| HR | `#/hr/contracts` | Employment contracts, effective period/status | `ResourceList`, `ContractEditor`, `AttachmentInput` |
| HR | `#/hr/timesheets` | Timesheet period and attendance records | `ResourceList`, `PeriodPicker`, `TimesheetGrid` |
| HR | `#/hr/shifts` | Shift definitions/calendar assignment | `ResourceList`, `ShiftEditor`, `ScheduleGrid` |
| HR | `#/hr/payroll` | Payroll period, totals and approval/status | `ResourceList`, `PayrollEditor`, `MoneySummary` |
| Fleet/catalog | `#/drivers` | Driver list, license/compliance, status and master-data actions | `ResourceList`, `DriverEditor`, `CompliancePanel` |
| Fleet/catalog | `#/vehicles` | Vehicle list: identifier, type, owner, capacity, status | `ResourceList`, `VehicleEditor`, `StatusToggle` |
| Fleet/catalog | `#/containers` | Container registry and availability/status | `ResourceList`, `ContainerEditor`, `StatusToggle` |
| Fleet/catalog | `#/locations` | Location master data and address/area mapping | `ResourceList`, `LocationEditor`, `AreaLookup` |
| Fleet/catalog | `#/areas` | Area hierarchy master data | `TreeResourceList`, `AreaEditor` |
| Catalog | `#/catalog/container-types` | Active/inactive container types, Excel import/export | `MasterDataList`, `MasterDataEditor`, `ImportExportMenu` |
| Catalog | `#/catalog/vehicle-types` | Active/inactive vehicle types | `MasterDataList`, `MasterDataEditor`, `ImportExportMenu` |
| Catalog | `#/catalog/units` | Units of measure | `MasterDataList`, `MasterDataEditor`, `ImportExportMenu` |
| Catalog | `#/catalog/cargo-types` | Cargo-type master data | `MasterDataList`, `MasterDataEditor`, `ImportExportMenu` |
| Catalog | `#/catalog/fee-types` | Fee-type master data | `MasterDataList`, `MasterDataEditor`, `ImportExportMenu` |
| Catalog | `#/catalog/currencies` | Currency list and exchange-rate synchronization | `MasterDataList`, `CurrencyEditor`, `SyncAction` |
| Organization | `#/org/own-company` | Company profile/settings form | `SettingsForm`, `AddressEditor`, `AttachmentInput` |
| Organization | `#/org/branches` | Branch master data | `MasterDataList`, `BranchEditor` |
| Organization | `#/org/departments` | Department hierarchy | `TreeResourceList`, `DepartmentEditor` |
| Organization | `#/org/teams` | Team master data and ownership | `MasterDataList`, `TeamEditor`, `ManagerLookup` |
| Organization | `#/org/users` | Users, branch/department, roles, state, last login, seat usage | `ResourceList`, `UserEditor`, `MultiLookup`, `SeatUsageCard` |
| Organization | `#/org/roles` | Role permissions and view-scope configuration | `ResourceList`, `RoleEditor`, `PermissionMatrix` |
| System | `#/system/activity` | Twelve-month filterable audit trail | `AuditLog`, `PeriodPicker`, `AdvancedFilter` |
| System | `#/system/code-rules` | Prefix/sequence/reset cadence code-generation rules | `ResourceList`, `CodeRuleEditor`, `PreviewCode` |
| System | `#/system/print-templates` | Drag/drop print template editor with data tokens | `TemplateLibrary`, `TemplateEditor`, `SortableCanvas`, `TokenPicker`, `RichTextEditor` |
| System | `#/system/approval-flows` | Sequential/multi-level rules for orders/payments/advances/settlements | `ApprovalFlowList`, `ApprovalFlowEditor`, `SortableStepList` |
| System | `#/system/shipment-types` | Shipment type configuration | `MasterDataList`, `MasterDataEditor` |
| System | `#/system/trip-statuses` | Trip-status configuration | `MasterDataList`, `StatusEditor` |
| System | `#/system/fee-rules` | Fee rule configuration | `ResourceList`, `FeeRuleEditor`, `MoneyInput` |
| System | `#/system/storage` | Storage/configuration page | `StorageSettings` |

The existing local `/fleet`, `/trips`, `/maintenance`, `/reports`, and
`/settings` pages are provisional. Their records and reusable pieces migrate to
the parity routes above; they are not substitutes for the reference pages.

## Visual system: do not approximate it

Create `lib/styles/movedx-tokens.css` from measured values: fonts, colors,
spacing, elevation, radii, sidebar/header dimensions, table density, badge
palette, form states, and z-index layers. Every component must consume tokens;
page YAML may choose semantic variants but cannot introduce arbitrary visual
styles. Replace the current emoji navigation with a consistent SVG icon set.

## Component architecture

Core3 remains a DOM/OOP framework. Third-party packages sit behind adapters;
pages never import a vendor directly.

```text
YAML page
  -> PageRenderer and ComponentRegistry
     -> BaseComponent subclass
        -> Core3 adapter (lifecycle, state, actions, cleanup)
           -> vendor instance when needed
              -> DOM
```

Add these framework directories:

```text
lib/components/layout/       AppShell, PageHeader, DashboardLayout, DetailDrawer
lib/components/data/         DataGrid, ResourceList, ColumnChooser, ExportMenu
lib/components/form/         FieldFactory, AsyncSelect, MultiSelect, DateRange,
                             DateTime, MoneyInput, FileUpload, AddressEditor
lib/components/domain/       LineItemGrid, ApprovalTimeline, AuditLog, Chat,
                             TemplateEditor, PermissionMatrix, StatusStepper
lib/adapters/                echarts, flatpickr, slim-select, sortable, xlsx,
                             tinymce, monaco, lucide
lib/yaml/                    schema, component-registry, action-registry,
                             datasource-contracts, validation
lib/styles/                  movedx-tokens.css, movedx-components.css
```

Every vendor adapter implements `mount`, `update`, and `dispose`, owns its DOM
node, and registers cleanup in `BaseComponent`. This prevents duplicate chart
instances, stale date pickers, document listeners, and drag handlers after a
YAML page redraw.

## Component catalogue and library choices

| Core3 component | Vendor / legacy precedent | YAML responsibility |
| --- | --- | --- |
| `EChart` | `echarts`; Core2 `chart.js` | chart type, source, series/axis mapping, period action, export |
| `DateRange` / `DateTime` | `flatpickr`; Core2 `datepicker.js` | locale, format, range, min/max, bind field |
| `AsyncSelect` / `MultiSelect` | `slim-select`; Core2 `select.js`, `multipleSearchEntry.js` | lookup source, id/label fields, multi-value serialization |
| `DataGrid` | Extend Core2 `gridView.js` design, not its implementation | columns, sorting, pagination, selection, sticky/hidden columns, row actions |
| `ImportExportMenu` | `xlsx`; Core2 `listView.js`, `buttonExcel.js` | import schema, export columns/file name, permission |
| `SortableStepList` / `SortableCanvas` | `sortablejs`; Core2 `section.js`, `kanbanColumn.js` | child collection, order field, drag rules, actions |
| `RichTextEditor` | `tinymce`; Core2 `richTextBox.js` | content field, toolbar, tokens, readonly state |
| `CodeEditor` | `monaco-editor`; Core2 `codeEditor.js` | language, schema/help, readonly state, field binding |
| `Icon` | `lucide` SVG package | semantic icon name, size, accessible label |
| `Modal` / `DetailDrawer` | Promote Core2 `popupEditor.js` pattern | title, width, actions, close guard, nested YAML components |
| `ApprovalTimeline` | New Core3 domain component | state, approvers, decision dates, allowed transitions |
| `TemplateEditor` | SortableJS + TinyMCE | token palette, sections, preview, print/export action |

Use the packages above rather than recreating charts, calendars, searchable
selects, drag/drop, spreadsheets, rich text, or code editing. Copy no Core2
implementation wholesale: it has a different component base, client contract,
and React assumptions. Reuse its behavior, APIs, and component boundaries as
the migration reference.

## YAML contract additions

Extend `page-renderer` only through validated, typed definitions. Add
`lib/yaml/schema.ts` and reject unknown component/action properties before
rendering. The core page grammar needs `layout`, `toolbar`, `filters`,
`components`, `datasources`, `actions`, `permissions`, and `detail` sections.

Example resource list:

```yaml
page:
  id: orders
  layout: resource-list
  auth: { require: [orders.read] }
toolbar:
  - { id: add, label: Add order, icon: plus, action: create, permission: orders.write }
  - { id: export, label: Export, icon: download, action: export }
filters:
  source: orders
  fields:
    - { field: period, type: date-range, preset: month }
    - { field: status, type: status-tabs, options_source: order_statuses }
    - { field: customer_id, type: async-select, source: customer_lookup }
components:
  - type: DataGrid
    source: orders
    selectable: true
    sortable: true
    column_chooser: true
    columns:
      - { field: code, type: LinkCell, label: Order no., action: open_detail }
      - { field: customer_name, type: TextCell, label: Customer }
      - { field: status, type: StatusCell, label: Status }
      - { field: total, type: CurrencyCell, label: Total, align: right }
detail:
  type: DetailDrawer
  component: OrderEditor
```

Action handlers remain server-authorized. YAML may name an action but cannot
supply arbitrary SQL, executable JavaScript, table names, or permission bypasses
from the browser. A server action registry validates fields, transitions,
tenant/branch scope, and audit event creation.

## Data, API, and authorization foundation

Before building business pages, replace the sample-only schema with migrations
for: company/tenant, branch/department/team, user/role/permission/view scope,
customer/contact/partner, location/area, vehicle/container/driver, order/order
line/shipment/trip, quote/quote line, fee/currency/exchange rate, attachment,
approval flow/step/decision, debit note/payment request/advance/settlement,
employee/contract/shift/timesheet/payroll, activity event, code rule, and print
template.

All relationships require foreign keys, indexes, timestamps, actor IDs, and
company/branch scope. Lifecycle transitions are named server actions (for
example `submit_for_approval`, `approve`, `reject`, `cancel`, `mark_paid`), not
generic arbitrary `PATCH` mutations. Each mutation writes an activity event.

Use the current DuckDB app only as a demo development store. Keep repository
methods database-neutral so production can move to the chosen multi-user
database without rewriting the YAML/component layer.

## Delivery waves

Each wave is implemented, tested, visually compared, and committed before the
next. No later page may create a private substitute for an earlier shared
component.

1. **Foundation and visual shell** — tokens, Lucide navigation, grouped
   collapsible sidebar, global search, profile/notification/language controls,
   route registry and YAML validation.
2. **Universal resource-list shell** — DataGrid sorting/selection/columns,
   advanced filters, date period, import/export, detail drawer, master-data
   editor. Validate with vehicle type and location pages.
3. **Organization and master data** — company, branches, departments, teams,
   users, roles, drivers, vehicles, containers, areas, catalog pages and
   scope/RBAC.
4. **Customer and partner CRM** — customers, partners, contacts, ownership,
   lifecycle and visibility.
5. **Orders and dispatch** — order editor, order lines, address/route lookup,
   status flow, dispatch queue, trip relation, schedule placeholder parity.
6. **Quotes and CRM analytics** — quote financial lines/profit, CRM dashboard,
   KPI reports, ECharts and exportable rankings.
7. **Financial document engine** — shared line-item/totals/approval engine,
   then debit notes, payment requests, advances, settlements and summaries.
8. **HR** — employees, attachments, contracts, shifts, timesheets, payroll.
9. **System configuration** — audit log, code rules, shipment/trip statuses,
   fee rules, storage.
10. **Template and approval builders** — print-template drag/drop/tokens and
    sequential/multi-level approval-flow editor.
11. **Chat and realtime** — thread workspace, messages, attachments, read
    state; add WebSocket/SSE adapter only after server semantics are defined.
12. **Parity hardening** — complete role matrix, CSV/XLSX round-trips, workflow
    failures, keyboard/accessibility, performance and migration tests.

## Wave acceptance and QA

For every page, write a QA inventory before implementation: visible controls,
state transitions, API effects, visual states, and expected evidence. Test with
normal mouse/keyboard interaction, not `evaluate()` shortcuts.

- Functional: create/edit/delete where reference permits; filter, sort, page,
  show/hide columns, import/export; state changes; permission denial; invalid
  form; empty/error/loading states.
- Framework: unit-test each adapter lifecycle and YAML schema; component tests
  for emitted actions; integration-test server permissions, scopes, transitions,
  audit events, and import validation.

## First execution backlog

The existing dashboard is only an exploratory slice. The next concrete commit
starts Wave 1 and replaces its provisional visual shell. Then Wave 2 establishes
the resource-list contract before any additional domain page is added. That
ordering prevents 47 divergent tables/forms and makes all subsequent pages
declarative.
