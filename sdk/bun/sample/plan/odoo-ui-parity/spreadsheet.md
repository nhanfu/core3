# Spreadsheet UI parity

Status: ready

This is an implementation gate and evidence record for the Odoo 19
`spreadsheet` and `spreadsheet_dashboard` addons. Each bounded batch below
records the source contract, implementation, verification, and deferred scope.

## Reference gate

- Odoo source: `/home/nhanjs/projects/odoo`, revision
  `659759969d535d286b656c96b675e4612b925ddd` (`65975996`), Odoo 19.0.
- Core engine manifest: `/home/nhanjs/projects/odoo/addons/spreadsheet/__manifest__.py`,
  version `1.0`, depends on `bus`, `web`, and `portal`. Its only XML data is
  `views/public_readonly_spreadsheet_templates.xml`; it declares no menus,
  window actions, or official demo records. Its assets provide the Odoo
  spreadsheet editor/runtime, charts, pivots, global filters, print bundle,
  binary spreadsheet field, backend loader, and public read-only shell.
- Dashboard manifest:
  `/home/nhanjs/projects/odoo/addons/spreadsheet_dashboard/__manifest__.py`,
  version `1.0`, depends on `spreadsheet`, and loads security, access CSV,
  dashboard views, menu views, and `data/dashboard.xml`. It declares no
  manifest `demo` list; `data/dashboard.xml` is official load-on-install data.
  It seeds the seven groups Sales, Finance, Logistics, Services, Marketing,
  Website, and Human Resources. Dashboard-specific addons may add more
  dashboards, but their menus are owned by their respective modules and are
  not silently counted as Spreadsheet menus.
- Live authenticated audit date: 2026-09-10, URL
  `http://localhost:8069`, database `core3_personal`, admin account from the
  parent parity plan. Authenticated `ir.module.module.search_read` reported:
  `spreadsheet` state `installed`, `demo: true`, installed/latest version
  `19.0.1.0`; `spreadsheet_dashboard` reported the same. The live database
  contains seven dashboard groups and four visible dashboards: Invoicing,
  Sales, Product, and Warehouse Metrics. This is evidence of the supplied
  database state only, not a claim that every optional dashboard addon is
  installed.
- Source facts and live facts are kept separate: the core manifest has no demo
  records, while the dashboard data XML is official seed data and the live
  module records currently report demo enabled.

## Live screenshot and route evidence

Authenticated headless Chrome evidence was captured with the supplied admin
credentials at exactly 1440x900 and 390x844. Screenshots are temporary files
under `/tmp`, never repository assets. Each capture waited for the dashboard
content, recorded zero `requestfailed` events, and asserted
`document.documentElement.scrollWidth === clientWidth`.

| Surface | Odoo route | Desktop | Mobile |
| --- | --- | --- | --- |
| Dashboards client action | `/odoo/dashboards?dashboard_id=2` | `/tmp/odoo-spreadsheet-personal-dashboard-desktop.png` | `/tmp/odoo-spreadsheet-personal-dashboard-mobile.png` |
| Configuration > Dashboards | `/odoo/action-499` | `/tmp/odoo-spreadsheet-personal-config-desktop.png` | `/tmp/odoo-spreadsheet-personal-config-mobile.png` |

The desktop dashboard capture visibly contains the Dashboards shell, date
filter, Share action, Sales/Product/Invoicing/Warehouse Metrics dashboard
cards, and the top navigation. The mobile dashboard capture visibly contains
the selected Sales dashboard, date-range control, Share, Days/Weeks/Months/
Quarters granularity, Top Countries map, and Top Categories treemap. The
configuration captures visibly contain New, the Dashboards list, and all
seven seeded group rows. The desktop and mobile captures have no horizontal
overflow.

The browser skill requested a persistent `js_repl`, which was not exposed in
this session; the authenticated Playwright fallback runner was used. This is
recorded so future evidence is reproducible rather than implying the missing
interactive tool was used.

## Source menu, action, route, and view inventory

Odoo action paths below are web-client aliases, not Python HTTP controller
routes. The source authority is
`addons/spreadsheet_dashboard/views/menu_views.xml` and
`addons/spreadsheet_dashboard/views/spreadsheet_dashboard_views.xml`.

| Visible menu/action | XML ID | Model/action | Odoo route | View modes and states |
| --- | --- | --- | --- | --- |
| Dashboards root | `spreadsheet_dashboard_menu_root` | `ir_actions_dashboard_action`, client tag `action_spreadsheet_dashboard`, path `dashboards` | `/odoo/dashboards` | Client dashboard shell; group navigation, dashboard cards, selected spreadsheet canvas, date filter, Share, chart/table interactions, loading, empty, error, and denied states |
| Dashboards | `spreadsheet_dashboard_menu_dashboard` | Same client action | `/odoo/dashboards` | Same client dashboard states; root and child intentionally resolve to the same action |
| Configuration | `spreadsheet_dashboard_menu_configuration` | Menu container, no action | menu parent | Expand/collapse only; child visibility follows ordinary dashboard configuration access |
| Configuration > Dashboards | `spreadsheet_dashboard_menu_configuration_dashboards` | `spreadsheet_dashboard_action_configuration_dashboards`, model `spreadsheet.dashboard.group` | `/odoo/action-308` in the live database | `list,form`; list is inline editable, sortable by handle for system users, group name, and nested dashboard list; form has name, Spreadsheets notebook, nested dashboard list; empty/error/denied states |
| Dashboard editor payload | client action internal state backed by `spreadsheet.dashboard` | `/spreadsheet/dashboard/data/<dashboard>` (`auth=user`, read-only) | fetched by `/odoo/dashboards` | Read-only serialized workbook snapshot, revisions, locale, currency, translation namespace; loading, missing dashboard/404, inaccessible/403, invalid payload/error |
| Spreadsheet activity logging | authenticated JSON-RPC controller | `/spreadsheet/log` (`POST`, `auth=user`) | no page route | download/copy/freeze/print logging only; invalid/unsupported action and empty datasource are no-op/error branches |
| Shared dashboard page | `spreadsheet.dashboard.share` controller | `/dashboard/share/<share_id>/<token>` (`auth=public`) | public share route | frozen read-only public spreadsheet shell; valid token, invalid token/404, revoked share, empty workbook, mobile overflow/error |
| Shared dashboard data | same share controller | `/dashboard/data/<share_id>/<token>` (`auth=public`) | JSON data route | frozen workbook JSON; valid, invalid/revoked token, missing share, malformed/empty payload |
| Shared dashboard download | same share controller | `/dashboard/download/<share_id>/<token>` (`auth=user`) | authenticated download route | XLSX download, invalid/revoked token, no-export permission/error |

The core `spreadsheet` addon by itself has no visible menu. The parity target
therefore includes the installed `spreadsheet_dashboard` addon and clearly
labels optional module-owned dashboard content as out of this sub-plan.
Record-linked spreadsheet dashboards, favorite toggles, publication, group and
company visibility, and spreadsheet cell actions are interactions inside the
listed client action or configuration form, not omitted menus.

## View and interaction state inventory

- Dashboard landing: group tabs/sections in sequence order; published and
  permitted dashboards only; dashboard card selection; selected workbook
  canvas; search/date-range control where supplied by dashboard data; chart,
  pivot, table, KPI, map, treemap, and linked Odoo menu cells; Share; print,
  copy, freeze, download, zoom, formula/editor commands as enabled by the
  workbook; loading, no published dashboards, missing workbook, server error,
  access denied, and malformed snapshot states.
- Dashboard list: groups, New, name column, row ordering, inline sequence
  handle for system users, nested dashboards, published boolean toggle,
  company restriction, user-group restriction, hidden technical binary data,
  search/list refresh, empty group, create validation, duplicate/conflict,
  401/403/404/409/422, and row-version refresh behavior.
- Dashboard group form: editable group name, Spreadsheets notebook, nested
  dashboard list, create/edit/delete/archive or publish controls according to
  source permissions, unsaved/discard, required name, protected official
  group deletion error, empty notebook, and mobile single-column form.
- Dashboard access: ordinary internal user, dashboard manager, system user,
  company-restricted user, wrong company, unpublished dashboard, revoked
  share, public share, and unauthenticated redirect/denial. Do not expose the
  binary workbook or cross-company data through a list query that bypasses
  these boundaries.
- Responsive behavior: at 1440x900 preserve Odoo shell, card/canvas density,
  toolbar, and content scrolling; at 390x844 collapse navigation/toolbars into
  usable controls, keep workbook gestures/action menus available, prevent
  page-level horizontal overflow, and allow deliberate spreadsheet canvas
  panning/zooming only inside its own bounded surface.

## Existing Core3 surface and parity gap

`services/spreadsheet` currently contains `manifest.yaml`, `storage.yaml`,
`permissions.yaml`, one foundation migration, `pages/dashboards.yaml`,
`pages/dashboard-detail.yaml`, `pages/dashboard-workflow.yaml`, and
`pages/analysis.yaml`. It exposes `/dashboards`, `/dashboard-detail`, and
`/spreadsheet-analysis`; the service menu also exposes `/spreadsheet-analysis`
as Dashboard Analysis. It has deterministic-looking dashboard/widget tables,
Draft/Published/Archived workflow states, list and card views, a detail form,
widget creation, publish/archive actions, and a totals/chart analysis page.

The current surface is not yet Odoo parity:

- It models custom `dashboards` and `dashboard_widgets`, not Odoo
  `spreadsheet.dashboard`, `spreadsheet.dashboard.group`, and shared workbook
  snapshots. It has no dashboard group list/form equivalent to `/odoo/action-308`.
- Reads and mutations are embedded in page YAML. They must move to
  convention-discovered `services/spreadsheet/api/*.yaml` fragments keyed by
  `page.id`; page YAML must remain layout/action composition only.
- The current menu says `Workspace` and `Dashboard Analysis` while Odoo shows
  root/child Dashboards and Configuration > Dashboards. Add explicit route
  mapping or a documented deliberate redirect for every difference.
- The migration uses `gen_random_uuid()` and current timestamps/defaults, has
  no Odoo-derived group/dashboard/workbook seed, no share model, no company or
  group relation tables, and no deterministic seed date. It also drops its
  tables in `down`; upgrade/idempotency and fixture ownership must be tested.
- There is no workbook snapshot/editor contract, public share/download/data
  boundary, spreadsheet log operation, formula/chart/pivot/global-filter
  fixture, dashboard-group nested form, favorite/publication parity, or
  protected official-group deletion behavior.
- The existing `order_transition` handler is an accidental generic boundary
  for dashboard publication. Replace or validate it through an explicit
  spreadsheet workflow/API contract before implementation sign-off.

## Required shared primitives

Reuse generic contracts before adding Spreadsheet-specific renderers:

- AppShell/menu groups and action-path navigation; responsive Odoo toolbar,
  breadcrumbs where applicable, tabs, dropdowns, date-range filters, Share,
  search, pager, empty/loading/error/denied shells, and content-only mobile
  scrolling;
- `ListView` with inline edit, handle ordering, optional columns, boolean
  toggle, nested relation/list rendering, row actions, permissions, and
  server-form validation;
- `OdooFormView`/`FormView`, notebook/tabs, nested one-to-many list, required
  fields, many-to-many tags, company/group selectors, save/discard, protected
  delete, optimistic refresh, and row-version conflict handling;
- spreadsheet canvas/editor contract with workbook snapshot loading, cell
  grid, formulas, charts, pivot/table/map/treemap figures, global date/text/
  numeric/selection filters, menu-link cells, print/export/download, freeze,
  copy, share, read-only and mobile gesture states;
- dashboard cards, KPI/stat, chart/figure, canvas pan/zoom, status/published
  control, permission-aware server actions, public-token shell, and stable
  401/403/404/409/422 error mapping.

## 2026-09-10 bounded implementation batch: Configuration > Dashboards

The authenticated personal Odoo 19 database was refreshed at
`http://localhost:8069` using database `core3_personal`. The live menu resolves
the configuration action to `/odoo/action-499` in this database (action ids are
database-specific; the earlier `/odoo/action-308` capture belongs to the
previous reference database). The installed view contract was verified before
implementation:

- Configuration > Dashboards is a `spreadsheet.dashboard.group` `list,form`
  action with `New`, a system-user sequence handle, and a single visible
  `Name` column. The live list contains the seven official groups in source
  sequence: Sales, Finance, Logistics, Services, Marketing, Website, and Human
  Resources.
- The group form exposes the group name in the sheet title and one notebook
  tab named `Spreadsheets`. Its nested dashboard list exposes `Name`, `Group`,
  `Companies`, and `Is Published`; mobile reduces this to the dashboard names
  and `Add Dashboard`.
- Source authority remains
  `addons/spreadsheet_dashboard/views/menu_views.xml`,
  `addons/spreadsheet_dashboard/views/spreadsheet_dashboard_views.xml`, and
  `addons/spreadsheet_dashboard/data/dashboard.xml` at revision `65975996`.

Core3 now maps this bounded contract through layout-only
`pages/dashboard-groups.yaml` and `pages/dashboard-group.yaml`, with the
page-id-owned API fragments `api/dashboard-groups.yaml` and
`api/dashboard-group.yaml`. The configuration list has Odoo's `New`/`Name`
shape and visible handle glyph; the nested list uses the Odoo field order and
read-only boolean toggle. The API declares deterministic `empty`, `not_found`,
and 503 transport-error branches, and the focused test covers migration
idempotency, fixed ordering, search, permission ownership, and nested rows.

Authenticated comparison evidence (temporary, never committed):

| Surface | Odoo personal | Core3 isolated worktree |
| --- | --- | --- |
| Configuration list desktop | `/tmp/odoo-spreadsheet-personal-config-desktop.png` | `/tmp/core3-spreadsheet-config-desktop.png` |
| Configuration list mobile | `/tmp/odoo-spreadsheet-personal-config-mobile.png` | `/tmp/core3-spreadsheet-config-mobile.png` |
| Group form desktop | `/tmp/odoo-spreadsheet-personal-group-form-desktop.png` | `/tmp/core3-spreadsheet-group-form-desktop.png` |
| Group form mobile | `/tmp/odoo-spreadsheet-personal-group-form-mobile.png` | `/tmp/core3-spreadsheet-group-form-mobile.png` |

Deferred from this batch: the client-action dashboard canvas and workbook
editor/runtime, dashboard group search panel and card selection, formula and
figure execution, global filters, favorite/publication mutations, CRUD and
row-version conflict operations, share/public-token/download controllers,
spreadsheet logging, company/group access enforcement, and the remaining
dashboard landing visual comparison. These remain required follow-up work;
this batch does not claim full Spreadsheet parity.

If a primitive is missing, plan and verify the generic contract first rather
than creating a page-specific substitute. Use Odoo-style full-width settings
and content-only scrolling conventions where a future Spreadsheet settings
surface is introduced; no settings menu exists in this source addon.

## Deterministic service-owned datasource/API/mock contract

All frontend pages must be layout-only. Add convention-discovered API fragments
under `services/spreadsheet/api/`, keyed by `page.id`, and prove discovery
without putting API fragments into a frontend `pages:` manifest. Every list,
form, dashboard canvas, chart, pivot/table, share, download, empty, loading,
error, and denied branch must have a service-owned datasource or declared
service operation with stable `mock_data` until its real query exists. No
page-local records, random IDs, `CURRENT_TIMESTAMP`, browser fixtures, remote
assets, or live Odoo calls are allowed.

Use seed date `2026-01-15`, stable IDs and ordering, and idempotent DuckDB and
supported-adapter migrations. Seed at minimum:

- all seven official group names and four observed dashboard names, plus an
  unpopulated group and a custom group;
- published, unpublished, archived, favorite, company-restricted,
  group-restricted, empty-workbook, populated-workbook, malformed/error-test,
  and dashboard-without-readable-main-model fixtures;
- workbook snapshots containing Sheet1, formulas, currencies, KPI/table/pivot/
  chart/map/treemap figures, global date/text/numeric/selection filters, menu
  links, hidden/empty rows, and stable chart data;
- ordinary user, dashboard manager, system user, wrong-company user, denied
  user, public share token, revoked token, and row-version conflict cases;
- deterministic widget/source projections for Core3 services, while
  cross-service data uses declared service operations rather than SQL joins
  across service-owned tables.

Required operations include group/dashboard CRUD where authorized, sequence
ordering, publish/unpublish, favorite toggle, archive/delete with protected
official-group rules, workbook read/write/save with row versions, widget and
figure updates, filter/date changes, export/download/logging, share creation
and revocation, public read-only data, and permission/company/group guards.
Return stable 401/403/404/409/422 responses for missing, denied, invalid,
conflicting, malformed, and unavailable data. Test fresh install, restart,
upgrade, idempotent migration, empty dashboard/group, backend 500, loading,
stale row version, revoked token, and dependency-disabled branches.

## Six-gate acceptance

1. **Manifest/demo gate:** implementation records the exact Odoo source
   revision, both manifests/versions/dependencies/assets, the distinction
   between no core demo records and dashboard `data/dashboard.xml`, and the
   live installed/demo state without conflating it with source availability.
2. **Visible inventory gate:** every source-visible menu, client/window
   action, controller route, list/form/canvas mode, nested action, toolbar,
   share/export action, and loading/empty/error/denied state above maps to a
   Core3 route/operation or has an explicit deliberate redirect/defer.
3. **Reference evidence gate:** authenticated navigation begins at the Core3
   Spreadsheet menu and covers `/dashboards`, dashboard selection, canvas,
   share/export controls, analysis if retained, and group configuration at
   1440x900 and 390x844. Reference evidence uses the four `/tmp` captures
   above, asserts visible titles/records, zero failed requests, and no page
   overflow. Screenshots are not committed.
4. **Datasource/fixture gate:** every visible state is backed by a discovered
   service API fragment and deterministic mock/seed data with stable IDs,
   seed date, workbook payloads, empty/error branches, operations, and
   permission/company/share boundaries. Fresh install/restart/upgrade and
   API response checks prove no page-local or random data.
5. **Primitive gate:** implementation reuses the shared menu, list, form,
   nested-list, spreadsheet canvas, chart/pivot/filter, share/download,
   responsive, permission, error, and conflict primitives; any missing
   generic primitive is separately planned and verified before page code.
6. **Behavior gate:** authenticated desktop/mobile checks cover navigation,
   list/form/canvas interactions, filters, chart/pivot/table figures, publish/
   favorite/archive/share/export workflows, empty/loading/error/denied/mobile
   states, permission and company boundaries, public-token limits, stable
   errors, no horizontal overflow, and `bun run audit` plus focused API/browser
   evidence. Commit contains docs/YAML/code only and no images.

## Exact uninstalled limitation

This limitation does not apply to the audited `core3_demo`: both required
addons are installed and their authenticated routes were observed. If a future
reference database reports either addon as `uninstalled`, the only truthful
claim is that its live menus, actions, records, installed demo data, client
routes, controller payloads, and screenshots are unavailable. Use the pinned
source manifest/XML/models as the contract, label official demo availability
as `source available / live not installed`, capture only the authenticated
Apps-page `Activate` state if useful, and do not fabricate installed dashboard
screenshots or payloads. Do not activate the addon as part of this plan-only
gate.

## Focused verification before implementation

- Parse the new markdown and inspect the source paths/revision listed here.
- Run the focused Spreadsheet YAML/API discovery and service audit from
  `sdk/bun/sample`; if the repository audit is broader than Spreadsheet,
  record unrelated failures rather than weakening this gate.
- Repeat authenticated Odoo route checks at both viewports, assert visible
  menu/action/title/seed records, collect failed requests, and assert no
  horizontal overflow.
- Run `git diff --check`; confirm `git status` contains only this plan before
  committing. Never add `/tmp` screenshots.
