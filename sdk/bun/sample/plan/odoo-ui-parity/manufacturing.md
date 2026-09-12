# Odoo 19 UI parity - Manufacturing

Status: in-progress (live reference addon is available; full parity remains incomplete)

## 2026-09-11 fresh-reference revalidation

- The bounded Work Orders Analysis slice was rechecked against the newly
  initialized `core3_codex_demo` database in `odoo-core3-codex` at
  `http://localhost:8069`, authenticated as `codex@core3.local`. The source
  XML ID `mrp.mrp_workorder_report` resolves to action 778 in this database
  and renders the same `graph,pivot,list,form` action contract. Fresh source
  captures are `/tmp/odoo-codex-manufacturing-work-orders-analysis-desktop-20260911.png`
  (1440x900, SHA-256
  `cd62c6a4e422041de0350f7bee38cb9232e0eaa63faba103bae720be3617fc89`) and
  `/tmp/odoo-codex-manufacturing-work-orders-analysis-mobile-20260911.png`
  (390x844, SHA-256
  `9fdfdfa8338fb3f19c72f90585e3c269ce932ee9a1b02dd3d9793bd874a072ea`).
- Core3 now explicitly sets `view_navigation: tabs`, matching the source's
  visible Graph, Pivot, and List navigation. Authenticated captures are
  `/tmp/core3-manufacturing-work-orders-analysis-desktop-postfix-20260911.png`
  (1440x900, SHA-256
  `f3626c996a2211feef43fe52f451c562a22ea54339576ccb8d2233779e5a454d`) and
  `/tmp/core3-manufacturing-work-orders-analysis-mobile-postfix-20260911.png`
  (390x844, SHA-256
  `7e491edc9975604dbdb793b3501d9873ee6902d8cd2524a57d56de9b05ec88e1`).
  Both Core3 captures show seeded report data, no page errors or failed
  requests, and body/document widths equal the viewport.
- Verification after the navigation correction: focused integration test 4
  pass / 44 assertions, UI audit 491 pages / 498 routes / 858 datasources,
  ESLint passed, global CSS rebuilt, and `git diff --check` passed.

## 2026-09-11 Manufacturing navigation-fidelity batch

- The live `core3_codex_demo` Odoo 19 reference was inspected and authenticated
  before implementation. The source contracts are:

  | Odoo menu/action | Runtime action | Model | Modes | Source route/state |
  | --- | ---: | --- | --- | --- |
  | Manufacturing / Operations / Manufacturing Orders (`mrp.menu_mrp_production_action` / `mrp.mrp_production_action`) | 796 | `mrp.production` | `list,kanban,form,calendar,pivot,graph,activity` | `/odoo/manufacturing`, 4 populated To Do rows |
  | Manufacturing / Products / Bills of Materials (`mrp.menu_mrp_bom_form_action` / `mrp.mrp_bom_form_action`) | 783 | `mrp.bom` | `list,kanban,form` | `/odoo/boms`, 8 populated rows |
  | Manufacturing / Configuration / Work Centers (`mrp.menu_view_resource_search_mrp` / `mrp.mrp_workcenter_action`) | 779 | `mrp.workcenter` | `list,kanban,form` | `/odoo/workcenters`, 3 populated rows |
  | Work Center `Assembly 1` → Productivity Losses (`mrp.mrp_workcenter_productivity_report_blocked`) | 776 | `mrp.workcenter.productivity` | `list,form,graph,pivot` | `/odoo/1/action-776` with 2 populated loss rows and active work-center context |

- The three menu entries were confirmed at runtime as `Manufacturing/Operations/Manufacturing Orders` (menu 522), `Manufacturing/Products/Bills of Materials` (menu 521), and `Manufacturing/Configuration/Work Centers` (menu 519). Productivity Losses has no standalone menu; Odoo launches action 776 from a Work Center. The source desktop surfaces expose text-labelled view controls; the mobile surfaces collapse their shell and retain populated responsive content without horizontal overflow.
- Core3 page YAML remains presentation-only and API YAML remains page-id-bound. The four affected presentation files now use `view_navigation: tabs`; Work Centers no longer marks Kanban as mobile-only, because Odoo exposes both List and Kanban in the desktop action. The Manufacturing Orders status lookup was changed from unsupported `data:` to deterministic `mock_data:`. The latter fixed the actual route failure (`SELECT COUNT(*) FROM ()`) when the page loaded its static status datasource.
- Core3 browser routes are module-qualified by the shell router while the page contracts retain their declared routes: `/manufacturing/manufacturing-orders` (`/manufacturing-orders`), `/manufacturing/boms` (`/boms`), `/manufacturing/work-centers` (`/work-centers`), and `/manufacturing/productivity-losses` (`/manufacturing/productivity-losses`). Each final capture was authenticated as `admin@tms.local`, populated from the isolated runtime, and inspected visually.

### Final paired capture matrix

All captures are PNGs under `/tmp` and are intentionally not committed. Every
final Core3 route reported `requestfailed=0`, `pageerror=0`, and exact
`documentWidth=bodyWidth=innerWidth` (`1440` or `390`). The visible tab labels
were `List/Kanban` for Manufacturing Orders, Bills of Materials, and Work
Centers, and `List/Graph/Pivot` for Productivity Losses.

| Surface | Odoo 1440x900 | Core3 1440x900 | Odoo 390x844 | Core3 390x844 |
| --- | --- | --- | --- | --- |
| Manufacturing Orders | `/tmp/odoo-codex-manufacturing-navigation-manufacturing-orders-1440x900.png` (`cc01a510e649ad3bfc99306d033c8f44e046717bbce56ad1a60626f8cb2f141e`) | `/tmp/core3-manufacturing-navigation-fidelity-manufacturing-orders-1440x900.png` (`ad12c140c93c6af46478c8fe8ed2cf1d25e5472285d4454f1d19240948d5bf82`) | `/tmp/odoo-codex-manufacturing-navigation-manufacturing-orders-390x844.png` (`48cd9d8a12fd98d1b62c384102861f44ec8477533b0657de32e6dbc2ca7e12e4`) | `/tmp/core3-manufacturing-navigation-fidelity-manufacturing-orders-390x844.png` (`885c3e2d11d7a82afe229312a8f538d0b5151a17cc26fb7b2be1d0012b3f4c78`) |
| Bills of Materials | `/tmp/odoo-codex-manufacturing-navigation-boms-1440x900.png` (`c4790a04a96040237ad41e920c45c47cc384a95cdf424977f95cb1cadf34d5b1`) | `/tmp/core3-manufacturing-navigation-fidelity-boms-1440x900.png` (`de0bd4914fc6dc8620c2c6bf1c1aa36d11497c480c7d5ed557a6ebc4510f7ca5`) | `/tmp/odoo-codex-manufacturing-navigation-boms-390x844.png` (`5272c080025bcc034d4116e324801b820312f883678568a13d3b3f6f78d979c9`) | `/tmp/core3-manufacturing-navigation-fidelity-boms-390x844.png` (`2229a1b30944f334c8ec3f557713ec06694eb582382721fe62dfca914f46a006`) |
| Work Centers | `/tmp/odoo-codex-manufacturing-navigation-work-centers-1440x900.png` (`e952b1d72af970fa7541a5092ab1ba800ca4cb54bec4ad2bdfba290105d1c590`) | `/tmp/core3-manufacturing-navigation-fidelity-work-centers-1440x900.png` (`39441bb2837870d8107457fc887f648941542186c6f75c5b0cfbfc1bf5b46cb1`) | `/tmp/odoo-codex-manufacturing-navigation-work-centers-390x844.png` (`31d2e768fb6a184b910802c426dacd08df09ebc44da6f5bfcc0d1c7f451ebd6e`) | `/tmp/core3-manufacturing-navigation-fidelity-work-centers-390x844.png` (`ed08803af57b6527dee0ba68cd8c4271b7081bd4f2900475bcd66697fb9e0078`) |
| Productivity Losses | `/tmp/odoo-codex-manufacturing-navigation-productivity-losses-1440x900.png` (`660749b265e555fd5f4486188fede0826f91700617192329581c1a8dfb00c962`) | `/tmp/core3-manufacturing-navigation-fidelity-productivity-losses-1440x900.png` (`e3c36e49301a4e11dc904153fa328dc20252297d551334c740b57c0b88dc0fa9`) | `/tmp/odoo-codex-manufacturing-navigation-productivity-losses-390x844.png` (`3e4b3902528b7f369c76d250e32961de53273067bbc9f97f478984144fb6ae48`) | `/tmp/core3-manufacturing-navigation-fidelity-productivity-losses-390x844.png` (`91259dc6fd95d3617c201eab6bb2280ed360498564438e7ccfe72d6410de5ac0`) |

- Final isolated-worktree verification: focused Manufacturing tests `15 pass / 188 assertions`; YAML audit `498 pages / 505 routes / 879 datasources`; ESLint passed; `bun run css:build:global` passed; and `git diff --check` passed. The test contracts assert `view_navigation: tabs`, the corrected Work Center desktop-visible Kanban mode, static status fixtures, source modes/menu placement, page/API separation, and the existing CRUD/permission boundaries.
- Remaining bounded difference: Core3 intentionally uses the shared Fluent shell and deterministic YAML fixtures, while Odoo uses its purple shell and live/demo ORM data. This batch verifies the populated initial list state and visible mode navigation at both viewports; it does not claim parity for unrelated form/chatter workflows or every secondary Odoo report state.

## 2026-09-12 Manufacturing Orders default-filter refresh

The active replacement reference is the fresh Odoo 19 stack at
`http://localhost:8073`, database `core3_codex_demo_20260912`. Its current
`mrp.mrp_production_action` is runtime action `675` for `mrp.production`, with
`list,kanban,form,calendar,pivot,graph,activity` modes and context
`search_default_todo=True`. The source therefore opens with the `To Do` filter
and four visible draft/confirmed/in-progress/to-close rows.

The authenticated comparison found that Core3's manufacturing-orders page was
loading all six deterministic lifecycle fixtures by default. The fix keeps
the full state filter available but adds the Odoo-shaped `To Do` option as the
default and teaches the datasource query that `state=todo` means Draft,
Confirmed, In Progress, or To Close. The page/API split and service-owned
fixtures remain unchanged. The resulting filtered route shows four rows at
both target sizes; the six-state workflow remains covered by the explicit
state and mutation tests.

| Surface | Viewport | Capture | SHA-256 |
| --- | --- | --- | --- |
| Odoo Manufacturing Orders list | 1440x900 | `/tmp/odoo-manufacturing-orders-list-desktop-1440x900-20260912.png` | `df7d2c208bfc3da28c9f07b716244546f3353162de7c00c440d4670496c4ec2f` |
| Odoo Manufacturing Orders Kanban | 1440x900 | `/tmp/odoo-manufacturing-orders-kanban-desktop-1440x900-20260912.png` | `e91e165833dbe2254f6ddb876cde273a83f04ae674a937e9b490234d117ab21f` |
| Odoo Manufacturing Order form | 1440x900 | `/tmp/odoo-manufacturing-orders-form-desktop-1440x900-20260912.png` | `677692870a62acba7e411bbfb7084e37971c34a3f8270496d3b5bd2f4f88e54c` |
| Odoo Manufacturing Orders list | 390x844 | `/tmp/odoo-manufacturing-orders-list-mobile-390x844-20260912.png` | `8719e71e8ba5157a9c2f29e0fbe84f4e2b7962f60ddd3d5175b89ec2bfffcca1` |
| Odoo Manufacturing Order form | 390x844 | `/tmp/odoo-manufacturing-orders-form-mobile-390x844-20260912.png` | `4ab85601a4c0da0c6b2a6444dce2ba9fcedf1299e2887403869d83331fdf5dbd` |
| Core3 Manufacturing Orders list | 1440x900 | `/tmp/core3-manufacturing-orders-filtered-desktop-1440x900-20260912.png` | `8d5f26a0500f5a320f9cd0a3b340a80abe21625a602d067f08397db21f52b049` |
| Core3 Manufacturing Orders Kanban | 1440x900 | `/tmp/core3-manufacturing-orders-filtered-kanban-desktop-1440x900-20260912.png` | `c2c74d915dc128351ced9bc01fc4e38c629cb5c0b01519fe28f5420d5d237878` |
| Core3 Manufacturing Order form | 1440x900 | `/tmp/core3-manufacturing-orders-filtered-form-desktop-20260912.png` | `bc40451ccbd7f7d7ba26bd5f962215502f8c3059c4e5b3ff53922b79be17d11d` |
| Core3 Manufacturing Orders list | 390x844 | `/tmp/core3-manufacturing-orders-filtered-mobile-390x844-20260912.png` | `44c8fd72c08b4cce3381654b6228d31e61d39d59b96f045a57f001a7ad90f5ea` |
| Core3 Manufacturing Order form | 390x844 | `/tmp/core3-manufacturing-orders-filtered-form-mobile-390x844-20260912.png` | `756b64c0cbd7f7d7ba26bd5f962215502f8c3059c4e5b3ff53922b79be17d11d` |

The focused suite passes 3 tests and 48 assertions; the worktree audit passes
with 545 pages, 552 routes, and 947 datasources, ESLint passes, and
`git diff --check` is clean. Both authenticated Core3 routes reported no page
errors or failed requests and no horizontal overflow. The intentional visual
residual remains the shared Fluent shell and Core3's deterministic row content
versus Odoo's purple shell and live demo records. Screenshots remain outside
Git.

## 2026-09-11 bounded Work Orders Analysis contract

- Source inspection was completed first against the authenticated personal
  database `core3_personal` at `http://localhost:8069` with the configured
  `codex@core3.local` account. The next uncovered action is Manufacturing /
  Reporting / Work Orders: menu `mrp.menu_mrp_work_order_report` (database ID
  553, parent Reporting ID 543), action `mrp.mrp_workorder_report` (database
  action ID 833), model `mrp.workorder`, and route
  `/odoo/work-orders-analysis`. The menu is restricted to
  `mrp.group_mrp_routings` (database group ID 91, “Manage Work Order
  Operations”); the model access rule grants the MRP user/administrator read,
  write, create, and delete, while this report action itself has no create or
  delete controls.
- The action declares `graph,pivot,list,form` and defaults to the OR-combined
  To Do (`ready`), Blocked, and In Progress (`progress`) filters plus Work
  center grouping. The source search view `mrp.view_mrp_production_work_order_search`
  (view 2454) exposes Work Order, Work Center, Manufacturing Order, Product,
  Component, To Do, Blocked, In Progress, Finished, Cancelled, Late, and
  Work Center/Manufacturing Order/Status/Date groupings. The report list view
  `mrp.mrp_production_workorder_tree_view` (view 2457, inheriting editable
  view 2455) uses Operation, Work Center, Product, Quantity, Expected
  Duration, Real Duration, action controls, and Status. The report graph is
  `mrp.workcenter_line_graph` (view 2461), with Duration (minutes), Duration
  Per Unit, and Expected Duration measures; the pivot is
  `mrp.workcenter_line_pivot` (view 2462). The form is
  `mrp.mrp_production_workorder_form_view_inherit` (view 2458): statusbar,
  Work Order, Work Center, Product, Quantity, Lot/Serial Numbers, Start Date,
  Expected Duration, Manufacturing Order, Time Tracking, and Components. It
  has `create="0"` and `delete="0"`; existing records open in the source
  editable form, but no new report records can be created from this action.
- The live personal database contains three work orders, all under Assembly 1
  in the default report scope. The authenticated reference renders one
  populated Assembly 1 group (three rows), empty Drill 1 and Assembly 2
  groups, a 360:00 Expected Duration total, and 00:00 Real Duration. The
  mobile source keeps the graph toolbar and collapses the shell/search
  controls while retaining the same 390px-wide report surface.
- Authenticated source captures were captured at exact 1440x900 and 390x844:
  `/tmp/odoo-manufacturing-work-orders-analysis-20260911/desktop-{graph,pivot,list-clean,form}.png`
  and
  `/tmp/odoo-manufacturing-work-orders-analysis-20260911/mobile-{graph,pivot,list,form-clean}.png`.
  All captures fit their viewport and had no HTTP errors or page errors; Odoo
  emitted only a benign aborted background `/mail/data` request while the
  page context closed. Hashes are recorded here before implementation so the
  later Core3 comparison remains reproducible:

  | Capture | Dimensions | SHA-256 |
  | --- | --- | --- |
  | Odoo desktop graph | 1440x900 | `cb5672384403eabf109816e2d1f7721afa57adc63ed2416e5f6bdb15f9eb647` |
  | Odoo desktop pivot | 1440x900 | `54ca3bb1235db0bbdb326652a0a8b79154aa8075f258874f71f6b6371b6e1e34` |
  | Odoo desktop list | 1440x900 | `02c32e0535a2a4ad74f8276b65d71c377b9b5ec2bcbed6beceee92a463c58bca` |
  | Odoo desktop form | 1440x900 | `0b420e6d36b58827462eea46edfff58da4891318b0ae74c04f5d1614ae37cc1e` |
  | Odoo mobile graph | 390x844 | `56ef5bf287db44723c043682160b32de0c29d0c2767c922686a0d8170912e232` |
  | Odoo mobile pivot | 390x844 | `a128e896c5fdd613de38ecf28f214f0655224c09b2121ba28343256f9a9df4ac` |
  | Odoo mobile list | 390x844 | `b5a85ab9f20172c76b26ef47c9257013de12bec7ceb8e6677491af30fd8adf55` |
  | Odoo mobile form | 390x844 | `69597e50b6cf962bf5b1c5c17193e6ef6376dd34ba64100a5c41efdd3b167c13` |


## 2026-09-11 bounded Manufacturing Settings follow-up

- Revalidated the next uncovered installed visible Manufacturing action in the
  authenticated personal database `core3_personal`: Manufacturing /
  Configuration / Settings is menu `mrp.menu_mrp_config` (runtime menu `559`),
  action `action_mrp_configuration` (runtime action `862`), model
  `res.config.settings`, and form-only. The live action defaults
  `group_mrp_routings=true`; the other visible MRP feature flags are false.
  Its current Community surface exposes Operations controls for Work Orders,
  Work Order Dependencies, Subcontracting, Barcode Scanner, Quality, Unlock
  Manufacturing Orders, By-Products, and Allocation Report for Manufacturing
  Orders, plus Planning / Master Production Schedule. Conditional Quality
  Control Worksheets are not visible because the corresponding module is not
  installed in this personal database.
- Core3 implements the bounded manager-only action at
  `/manufacturing/settings`. `pages/settings.yaml` is presentation-only;
  `api/settings.yaml` owns the `manufacturing-settings` page-id datasource and
  save mutation. The exact Configuration / Settings menu is owned by
  `manufacturing.manage`. Migration `0.0.13` adds one deterministic
  `manufacturing-settings-demo` row dated `2026-01-15`, preserving the live
  default flags and company. Save covers boolean updates with row-version
  compare-and-swap; the focused test covers idempotent migration, page/API
  separation, default and empty fixtures, successful save, stale-write `409`,
  missing-record `404`, and explicit `401`/`403`/`503` datasource states.
- Implementation checkpoint: `2f5a47bb` (`feat(manufacturing): add settings
  parity slice`). Visual/contract refinement checkpoint follows as a separate
  fix commit, keeping the implementation checkpoint intact. The focused
  suite is `test/manufacturing_settings.integration.test.ts`: 3 tests and 19
  assertions passed. Generated CSS was built with `bun run css:build` in the
  isolated worktree; the Manufacturing stylesheet reuses the existing Odoo
  SettingsView styling primitive.
- Authenticated paired captures were inspected at 1440x900 and 390x844. Odoo
  action `862` paths are `/tmp/odoo-manufacturing-settings-desktop-1440x900.png`
  and `/tmp/odoo-manufacturing-settings-mobile-390x844.png`; Core3 paths are
  `/tmp/core3-manufacturing-settings-desktop-1440x900.png` and
  `/tmp/core3-manufacturing-settings-mobile-390x844.png`. All four captures
  have exact viewport width with no horizontal overflow; both Core3 captures
  recorded no failed requests or page errors, and both Odoo captures recorded
  no failed requests, HTTP errors, or page errors.
- SHA-256 evidence hashes:
  - Odoo desktop: `d2030777e9024daac4e84b9cf3fe7bacd0f7c99733f6d22793f53613f0b0d698`
  - Odoo mobile: `0ceee2192a11033d89c2a4137c852acc6a34b489d57343c56d343ac1ed23e7dc`
  - Core3 desktop: `3ddbb395be550afdaa3457fd09694d261a19dad8d007ddac0a50b718d1880fff`
  - Core3 mobile: `3b76e5c33f3331a349395cdb97fa9b38cfad25370195ec92ed9e77273cb0eca0`
- Deliberate bounded visual limits: the live Odoo reference uses its purple
  Settings shell and shows Enterprise badges for unavailable Enterprise
  features; Core3 uses the shared Fluent shell and only renders the installed
  Community controls. Chatter, module-install side effects, conditional
  worksheet controls, and cross-module Work Center navigation remain outside
  this settings slice. Images remain under `/tmp` and are not committed.

## 2026-09-11 bounded Scrap Orders follow-up

- Revalidated the next uncovered installed Manufacturing action in the
  authenticated personal database `core3_personal`: Manufacturing / Operations
  / Scrap is the duplicated `stock.menu_stock_scrap` surface, rendered by
  runtime action `537` (`stock.action_stock_scrap`) for model `stock.scrap`.
  The authenticated source route is `/odoo/scraps`; its action modes are
  `list,form,kanban,pivot,graph`. The visible list labels are Reference, Date,
  Product, Quantity, Unit, Company, and Status. The search contract exposes
  Reference, Product, Location, Scrap Location, and Created on, with Product,
  Location, Scrap Location, Transfer, Draft, Done, and Manufacturing Order
  grouping/filter entries. The form exposes Product, Quantity, Replenish
  Quantities, Scrap Reason, Source Document, Company, Draft/Done status, and
  the Validate action.
- The personal database has zero persisted `stock.scrap` rows. Odoo therefore
  renders its installed `sample="1"` placeholder rows in the authenticated
  list and kanban views; the evidence below intentionally preserves that live
  behavior rather than mutating the reference database. At 390x844 Odoo
  resolves the action to `/odoo/scraps?view_type=kanban`.
- Core3 implements the bounded action at `/manufacturing/scraps` with detail
  `/manufacturing/scraps/detail`, and adds the exact `Scrap` menu under
  Manufacturing / Operations. Pages `manufacturing-scraps` and
  `manufacturing-scrap-detail` remain presentation-only; `api/scraps.yaml`
  and `api/scrap-detail.yaml` own the page-id-bound datasources and mutations.
  The list provides List, Form, Kanban, Pivot, and Graph modes; a mobile-only
  Kanban card view follows the shared responsive renderer used by the other
  Odoo-style lists. Source/Scrap Location stay available in filters and the
  detail form, while the visible list columns match the authenticated Odoo
  user's current list.
- Migration `0.0.12` seeds six stable Scrap Orders dated `2026-01-15` through
  `2026-01-20`: three Draft and three Done rows across My Company (San
  Francisco) and Core3 Vietnam, with products, quantities, locations, source
  documents, manufacturing orders, lots, replenishment flags, and notes. The
  API covers reference-ascending default/search/filter/group fixtures, empty,
  not-found, and transport-error states with explicit 401/403/404/503
  contracts. Mutations cover create/edit, duplicate-reference and positive
  quantity validation, Draft -> Done Validate, row-version stale rejection,
  and guards preventing Done edits or deletion.
- Authenticated paired captures were inspected at 1440x900 and 390x844. Odoo
  list/form evidence is `/tmp/odoo-manufacturing-scrap-desktop-1440x900-
  {list,form}.png` and `/tmp/odoo-manufacturing-scrap-mobile-390x844-
  {list,form}.png`. Core3 list/detail evidence is
  `/tmp/core3-manufacturing-scrap-desktop-1440x900-
  {list,detail}-final.png` and `/tmp/core3-manufacturing-scrap-mobile-
  390x844-{list,detail}-final.png`. The final Core3 browser pass recorded no
  failed requests or page errors and exact `390x390` / `1440x1440` document
  widths with no horizontal overflow. Screenshots remain under `/tmp` and are
  not committed.
- The implementation checkpoint is `34e84d41`; responsive/list parity fixes
  are `0dbf0f42` and `287996aa`. The focused suite is
  `test/manufacturing_scrap_orders.integration.test.ts` (4 tests, 50
  assertions), including idempotent migrations, page/API ownership, route
  discovery, deterministic fixtures, workflow, stale-write, and delete guards.
  The shared Core3 Fluent shell, fixed demo data, and detail-oriented location
  fields differ from Odoo's purple shell, generated sample placeholders, and
  user-group-dependent list visibility; chatter, scrap reason tags, Stock
  Operation/Product Moves stat actions, and inventory move-line integrations
  remain outside this bounded Manufacturing action slice.

## 2026-09-11 bounded Unbuild Orders follow-up

- Revalidated the next installed visible Manufacturing action in the
  authenticated personal database `core3_personal`: Manufacturing / Operations
  / Unbuild Orders is menu `mrp.menu_mrp_unbuild` (runtime menu `558`), action
  `mrp.mrp_unbuild` (runtime action `861`), model `mrp.unbuild`, and the live
  action path is `/odoo/unbuild-orders`. Its exact modes are
  `list,kanban,form,activity`; the search view exposes Product, Manufacturing
  Order, Draft, Done, Product grouping, and Manufacturing Order grouping. The
  list labels are Reference, Product, Bill of Material, Manufacturing Order,
  Lot/Serial Number, Quantity, Unit, Company, and Status. The form exposes the
  same fields plus Source Location, Destination Location, the Draft/Done
  statusbar, the `Unbuild` button, and the post-completion `Product Moves`
  stat button. Source view records are `mrp_unbuild_search_view`,
  `mrp_unbuild_kanban_view`, `mrp_unbuild_form_view`, and
  `mrp_unbuild_tree_view`.
- The live database has zero persisted `mrp.unbuild` rows; Odoo therefore
  renders its `sample="1"` demonstration rows in the list and kanban views.
  The authenticated Odoo captures intentionally preserve that behavior rather
  than creating a record in the reference database. Mobile Odoo resolves the
  action to Kanban, matching the responsive source view behavior.
- Core3 implements the bounded action at `/manufacturing/unbuild-orders` with
  detail `/manufacturing/unbuild-orders/detail`, and exposes the exact
  `Unbuild Orders` menu under Manufacturing / Operations. The presentation-only
  pages are `manufacturing-unbuild-orders` and
  `manufacturing-unbuild-order-detail`; `api/unbuild-orders.yaml` and
  `api/unbuild-order-detail.yaml` own all datasources and mutations and join
  the pages by matching `page.id`.
- Migration `0.0.11` seeds six stable rows at `2026-01-15`: three Draft and
  three Done orders, two companies, products/BOMs, manufacturing orders,
  lots, locations, activity fields, and product-move counts. The list covers
  default, search, Status/Company filters, empty, not-found, and transport
  error fixtures. Datasources declare explicit 401, 403, 404, and 503 states;
  mutations cover create/edit validation, duplicate references, Draft → Done
  `Unbuild`, row-version stale rejection, and guards preventing Done edits or
  deletion. The focused suite is
  `test/manufacturing_unbuild_orders.integration.test.ts` (4 tests, 47
  assertions), including idempotent migration and route discovery checks.
- Authenticated paired captures (all images remain under `/tmp`) are:
  `/tmp/odoo-manufacturing-unbuild-orders-desktop-1440x900-{list,kanban,form}.png`,
  `/tmp/odoo-manufacturing-unbuild-orders-mobile-390x844-{list,kanban,form}.png`,
  `/tmp/core3-manufacturing-unbuild-orders-desktop-1440x900-{list,kanban,form}-final.png`,
  and `/tmp/core3-manufacturing-unbuild-orders-mobile-390x844-{list,kanban,form}-final.png`.
  The browser matrix reported no failed requests, page errors, or horizontal
  overflow at either viewport. The authenticated desktop workflow capture
  `/tmp/core3-manufacturing-unbuild-orders-desktop-done-final.png` records a
  Draft row changing to Done with revision 2 and two Product Moves.
- Deliberate bounded limits: Odoo's persisted reference is empty and its
  generated sample values are not deterministic; Core3 uses fixed fixtures for
  reproducible comparisons. Core3 renders Product Moves as the exact count
  field but does not add the separate Stock Moves action, and it does not
  synthesize Odoo chatter, attachments, component move lines, or the
  simplified MO-launched wizard. Those cross-module and wizard surfaces remain
  outside this one installed action slice.

## 2026-09-11 bounded Overall Equipment Effectiveness follow-up

- Revalidated the next uncovered visible Manufacturing action in the
  authenticated personal database `core3_personal`: Reporting / Overall
  Equipment Effectiveness is runtime menu `549`
  (`menu_mrp_workcenter_productivity_report`), action `836`
  (`mrp_workcenter_productivity_report`), model
  `mrp.workcenter.productivity`, and route
  `/odoo/equipement-effectiveness` (the Odoo route intentionally uses the
  source spelling `equipement`). Its modes are `graph,pivot,list,form`; the
  context groups by Workcenter and Loss Reason and disables create/edit. The
  list exposes Start Date, End Date, Work Center, User, Loss Reason, Duration
  (minutes), and Company. The read-only form exposes Manufacturing Order, Work
  Order, Work Center, Loss Reason, Start Date, End Date, Duration, Company,
  and Description. Live demo data rendered Assembly 1 and Drill 1 with
  7,200 total productive minutes.
- Core3 implements the bounded report at `/manufacturing/oee` and its
  read-only detail at `/manufacturing/oee/detail`. Frontend pages
  `manufacturing-oee` and `manufacturing-oee-detail` remain presentation-only;
  `api/oee.yaml` and `api/oee-detail.yaml` own the report/detail queries and
  are joined by matching `page.id`. Migration `0.0.10` seeds six stable
  productivity rows dated from `2026-01-10` through `2026-01-13`, two work
  centers, productive/availability losses, manufacturing/work-order links,
  and the exact 7,200-minute aggregate. The report supports default grouped
  rows, search, work-center/loss/effectiveness filters, date range filtering,
  graph/pivot/list/form navigation, empty results, and explicit 401/403/503
  datasource errors; the detail supports 401/403/404/503 boundaries.
- Because Odoo sets `create:False,edit:False`, this slice intentionally adds no
  CRUD, workflow, or stale-write mutation. All report/detail datasources and
  navigation require `manufacturing.read`; the focused suite verifies the
  read-only permission boundary and no mutation actions are exposed.
- Authenticated paired viewport captures are under `/tmp` and are not
  committed. Odoo paths are
  `/tmp/odoo-manufacturing-oee-{desktop,mobile}-{graph,pivot,list,form}-final.png`;
  Core3 paths are
  `/tmp/core3-manufacturing-oee-{desktop,mobile}-{graph,pivot,list,detail}-final.png`.
  The browser matrix covered all four modes at 1440x900 and 390x844. Core3
  had no relevant failed requests or page errors and `scrollWidth` equaled
  the viewport width on every capture; Odoo had no page errors and also fit
  both viewports, with mobile-only aborted background mail/avatar requests
  during rapid view navigation.
- Known bounded visual limits: Odoo's official demo productivity timestamps
  are generated from the current date while Core3 is intentionally fixed for
  deterministic fixtures, so displayed dates differ. Odoo collapses grouped
  mobile list headers while the shared Core3 list keeps the report rows
  expanded. Core3 uses the shared responsive pivot/table renderer rather than
  Odoo's exact canvas/table chrome, and the read-only detail does not synthesize
  chatter or mutation controls that the live OEE form does not expose. No
  worksheet control was added because the installed OEE action exposes no
  worksheet field; separate Productivity Losses, Work Orders Performance,
  Unbuild, and other report actions remain outside this slice.

## 2026-09-11 bounded Operations follow-up

- Revalidated the live personal reference before implementation against
  `core3_personal` at `http://localhost:8069`: `mrp` is installed
  (`19.0.2.0`, demo enabled), `mrp.mrp_routing_action` is runtime action 855,
  `mrp.menu_mrp_routing_action` is runtime menu 554, and the model is
  `mrp.routing.workcenter`. The action exposes `list,kanban,form`; the
  authenticated action URL is `/odoo/action-855`. In this Odoo build the
  friendly `/odoo/operations` URL redirects to Discuss, so it is not used as
  screenshot evidence.
- The five live demo rows are represented in Core3 `/manufacturing/operations`
  with Odoo-visible Operation, Bill of Material, Work Center, Duration
  (minutes), Duration Computation, Default Duration, Cost based on, Company,
  active/archive, and dependency fields. The list and detail pages are
  presentation-only; `api/operations.yaml` and `api/operation-detail.yaml`
  own all queries and mutations and join the pages by `page.id`.
- Migration `0.0.9` seeds stable `2026-01-15` Operations fixtures. Focused
  coverage includes active/search/empty/not-found/transport-error states,
  create/edit, duplicate-name `409`, invalid-duration/mode `422`, stale-row
  `409`, missing `404`, archive/restore, and in-use delete `409` guards with
  explicit read/write/manage permissions.
- Authenticated paired captures were performed at 1440x900 and 390x844 using
  the live personal Odoo action and the isolated Core3 runtime. Odoo list,
  kanban, and populated form paths are `/tmp/odoo-manufacturing-operations-
  {desktop-1440x900,mobile-390x844}-{list,kanban,form}.png`; Core3 paths are
  `/tmp/core3-manufacturing-operations-
  {desktop-1440x900,mobile-390x844}-{list,kanban,form}.png`. The final rerun
  reported zero failed/4xx+ responses and no horizontal overflow on every
  surface. Images remain under `/tmp` and are not committed.
- Deliberate bounded limitations: the current live action has no worksheet
  field in its installed `mrp.routing.workcenter` form, so no synthetic
  worksheet control was added; inline dependency/variant relation editors,
  chatter data, cross-company record rules, and the separate OEE/Unbuild/report
  actions remain outside this slice. The full Manufacturing readiness gate
  remains open.

## 2026-09-11 bounded Work Centers follow-up

- Revalidated the installed Odoo contract against `core3_owned`: `mrp.mrp_workcenter_action` (runtime action 839), menu `mrp.menu_view_resource_search_mrp` (runtime menu 519), model `mrp.workcenter`, route `/odoo/workcenters`, and `list,kanban,form` modes. The list uses sequence/name/code/tags/alternatives/productive time/cost/hourly efficiency/OEE/setup/cleanup/company; the form uses `General Information` and `Product Capacities` notebook tabs plus the OEE/Lost/Load/Performance stat buttons and chatter.
- The isolated Manufacturing follow-up aligns Core3 `/work-centers` to that list/kanban contract, uses the shared responsive ListView behavior, and renders the populated OdooFormView with the matching field labels, two tabs, archive/restore/delete guards, deterministic `2026-01-15` fixtures, and explicit read/write/manage permissions. Backend SQL remains in page-id-bound API fragments; frontend pages remain presentation-only.
- Authenticated captures are under `/tmp`: Odoo desktop `/tmp/odoo-manufacturing-work-centers-desktop-{list,kanban,form}.png`, Odoo mobile `/tmp/odoo-manufacturing-work-centers-mobile-{list,form}.png`, and Core3 final desktop `/tmp/core3-manufacturing-work-centers-desktop-{list,form}.png`. The final Core3 mobile list/form pair was not refreshed after the row-navigation adjustment, and the shared renderer did not expose a Kanban switcher in the runtime control panel, so those are explicit evidence gaps rather than signoff claims. Browser runs used `domcontentloaded` plus fixed waits; no `networkidle` dependency was used.
- Deliberately deferred in this bounded slice: cross-module OEE/Load/Performance/Operations report targets, mail chatter data, and inline Product Capacities CRUD. No fake Manufacturing routes were added for those source actions.

## 2026-09-11 bounded Productivity Losses follow-up

- Revalidated the uncovered live source action in the authenticated personal
  database `core3_personal`: Work Center `Assembly 1` opens the button action
  `mrp_workcenter_productivity_report_blocked` (runtime action `831`), model
  `mrp.workcenter.productivity`, at
  `http://localhost:8069/odoo/work-centers/1/action-831`. Its modes are
  `list,form,graph,pivot`. The list fields are Start Date, End Date, Work
  Center, User, Loss Reason, Duration (minutes), and Company; the form adds
  Manufacturing Order, Work Order, and Description. The live list contains
  Equipment Failure and Material Availability rows scoped to Assembly 1.
  Direct `/odoo/action-831` is not a valid source entry point in this Odoo
  build because its default context evaluates `active_id`; the Work Center
  stat-button route is therefore the authoritative action path.
- Core3 implements the bounded report at
  `/manufacturing/productivity-losses` and the detail route at
  `/manufacturing/productivity-losses/detail`. The Work Center detail now
  exposes the `Lost` stat button and passes `workcenter_id` into the report.
  `pages/productivity-losses.yaml` and
  `pages/productivity-loss-detail.yaml` are presentation-only; the separate
  `api/productivity-losses.yaml` and `api/productivity-loss-detail.yaml`
  fragments own page-id-bound queries, permissions, CRUD, validation, and
  row-version guards. Migration `20260911210000-014-productivity-losses.yaml`
  seeds six deterministic loss reasons and reuses the existing OEE loss rows.
  Work-center option values use the same names submitted by the form guards,
  and the mobile list intentionally retains only Start Date and End Date like
  the live source.
- Focused verification after the responsive/selector fix:
  `bun test test/manufacturing_productivity_losses.integration.test.ts` passed
  with 4 tests and 47 assertions. The suite covers page/API separation,
  route discovery, Work Center stat navigation, all four modes, six reasons,
  scoped/search/type/date/empty/error states, CRUD, validation, stale writes,
  and detail not-found/forbidden states.
- Authenticated source captures at exact 1440x900 are:
  `/tmp/odoo-manufacturing-productivity-losses-desktop-1440x900-list.png`,
  `...-form.png`, `...-graph.png`, and `...-pivot.png`. Exact 390x844 source
  captures are `/tmp/odoo-manufacturing-productivity-losses-mobile-390x844-list.png`
  and `...-form.png`; the live mobile control bar hides Graph/Pivot, so no
  mobile source images for those unreachable view switches are claimed.
  Authenticated isolated Core3 captures at exact 1440x900 are
  `/tmp/core3-manufacturing-productivity-losses-1440x900-{list,form,graph,pivot}-final.png`;
  exact 390x844 captures are
  `/tmp/core3-manufacturing-productivity-losses-390x844-{list,form,graph,pivot}-final.png`.
  The Core3 browser pass used `http://localhost:3004` with the authenticated
  Core3 user, found no page/request/HTTP errors, and reported
  `scrollWidth === innerWidth` (1440 and 390) on every capture. Images remain
  under `/tmp` and are not committed.
- Evidence SHA-256 hashes:

  | Capture | Path | Dimensions | SHA-256 |
  | --- | --- | --- | --- |
  | Odoo desktop list | `/tmp/odoo-manufacturing-productivity-losses-desktop-1440x900-list.png` | 1440x900 | `672d442140dcb1c873a309281ac3f2378af773916ca553d6eb0cd523da3ad5af` |
  | Odoo desktop form | `/tmp/odoo-manufacturing-productivity-losses-desktop-1440x900-form.png` | 1440x900 | `0aa4e6b433ad6cc7141db59a0cdf2036ac87dec6280e2600b2622c389b49675a` |
  | Odoo desktop graph | `/tmp/odoo-manufacturing-productivity-losses-desktop-1440x900-graph.png` | 1440x900 | `ffa713baf919567f44fd4dce92a1d54e38e4d8b9b23d46fe5b58454d94c8587e` |
  | Odoo desktop pivot | `/tmp/odoo-manufacturing-productivity-losses-desktop-1440x900-pivot.png` | 1440x900 | `be4ffc0aaacac4e535e08f5c2f2e2903a43a2f979e8a5271ec02bdd96b0d9022` |
  | Odoo mobile list | `/tmp/odoo-manufacturing-productivity-losses-mobile-390x844-list.png` | 390x844 | `f3d81609d9629029c258807c706e981bb89a6d76d6cb78ea8b1a0591c5a5a24d` |
  | Odoo mobile form | `/tmp/odoo-manufacturing-productivity-losses-mobile-390x844-form.png` | 390x844 | `a46f2b817c596b2a0e34e5f2da64dae610987acc1f336cf29cd6e188f7affba7` |
  | Core3 desktop list | `/tmp/core3-manufacturing-productivity-losses-1440x900-list-final.png` | 1440x900 | `bc8f8066315f3cf0f49fc32bf942ef2ffff16f4e7482edf407a5b5924815b891` |
  | Core3 desktop form | `/tmp/core3-manufacturing-productivity-losses-1440x900-form-final.png` | 1440x900 | `aeb08162b55c184bf55508ce909931cd923ad60639697ad44c1917fda3e1a241` |
  | Core3 desktop graph | `/tmp/core3-manufacturing-productivity-losses-1440x900-graph-final.png` | 1440x900 | `90c6b0838a02fd4e6946ea9e8682816576e79f5d1d317334622d9654746c3b3c` |
  | Core3 desktop pivot | `/tmp/core3-manufacturing-productivity-losses-1440x900-pivot-final.png` | 1440x900 | `59d6e31f7e19107f49940148daff22640f810d29f4266442009b84625000947d` |
  | Core3 mobile list | `/tmp/core3-manufacturing-productivity-losses-390x844-list-final.png` | 390x844 | `0724cc8d448b2d61826aea1130c2934b6d3cf513c21816e995bdc82cccc4840f` |
  | Core3 mobile form | `/tmp/core3-manufacturing-productivity-losses-390x844-form-final.png` | 390x844 | `bdf76f91c15cb5966da61fbe2d26fcf8d2c7e3de3eb4679986c8d6f387d2e4f7` |
  | Core3 mobile graph | `/tmp/core3-manufacturing-productivity-losses-390x844-graph-final.png` | 390x844 | `23075b5b2bb072deeaf2617da91c0d27f9b210b0bb15967f4769a8bfb19184f5` |
  | Core3 mobile pivot | `/tmp/core3-manufacturing-productivity-losses-390x844-pivot-final.png` | 390x844 | `f42e2d0110a433f060704b97c945646c14edc1c4ad19f5b4e0d29f9455b71d19` |

- Comparison/fixes: the initial isolated runtime needed the repository CSS
  bundle built before screenshots; rebuilding with `bun run css:build` restored
  the authenticated Core3 shell. The responsive fix then removed Work Center,
  Loss Reason, and Duration from the mobile list and fixed the selector value
  contract. Remaining bounded differences are Odoo's purple shell versus the
  shared Core3 Fluent shell, Odoo's current-date/timezone-rendered timestamps
  versus deterministic `2026-01-10` fixtures, duplicated breadcrumb labels in
  the Core3 detail, and Odoo's zero-duration graph axes/legend versus Core3's
  empty-state message when every plotted duration is zero. Core3's pivot uses
  the shared table renderer rather than Odoo's compact expandable pivot chrome;
  these are recorded residuals, not hidden parity claims.
- Implementation checkpoints are `1c173ce4`
  (`feat(manufacturing): add productivity losses parity slice`) and
  `5b5ccc61` (`fix(manufacturing): align productivity loss responsive
  selectors`). This evidence/documentation checkpoint is committed separately
  after those implementation commits.

## 2026-09-10 bounded implementation progress

- The owned authenticated reference database `core3_owned` has Manufacturing
  installed with demo data. The disjoint Configuration / Work Centers action
  (`mrp_workcenter_action`, action 872, model `mrp.workcenter`,
  `list,kanban,form`) is implemented in Core3 as `/work-centers` with a
  presentation-only list/detail pair, page-id-bound API fragments, fixed
  2026-01-15 fixtures, CRUD/archive permissions, and explicit empty/error/
  not-found/validation/conflict states.
- The Products / Bills of Materials action (`menu_mrp_bom_form_action`, menu
  574, `mrp_bom_form_action`, action 876, model `mrp.bom`) is implemented in
  Core3 as `/manufacturing/boms` with a page-only list/kanban layout and icon
  view controls, a page-only form detail route, page-id-bound API fragments,
  eight deterministic fixtures matching the installed Odoo rows, components/
  operations/by-products tabs, and CRUD/archive/restore/duplicate guards.
- The Operations / Manufacturing Orders action (`menu_mrp_production_action`,
  model `mrp.production`) is implemented in Core3 as `/manufacturing-orders`
  with page-only list/detail layouts, page-id-bound API fragments, deterministic
  six-state fixtures, work-order and stock-move detail rows, and permissioned
  Confirm → Start → Mark produced → Close / Cancel transitions. Focused tests
  cover discovery, search/filter/empty/error/detail fixtures, validation, stale
  writes, and invalid transitions. The authenticated browser matrix remains
  incomplete: Odoo desktop list/detail captures exist under `/tmp`, while Core3
  and mobile captures were not completed.
- The Operations / Work Orders action (`mrp_workorder_todo`, model
  `mrp.workorder`, `list,kanban,form,calendar,pivot,graph`) is implemented in
  Core3 as `/workorders` with a page-only six-mode list and a page-only
  Odoo-style detail form at `/workorders/detail`. Its API fragments are bound
  by `page.id`, migration `0.0.7` adds seven stable work-order fixtures across
  waiting, ready, progress, finished, blocked, and cancelled states, and the
  plan/start/pause/block/continue/cancel actions use permissioned state and
  row-version compare-and-swap guards. Empty, not-found, and transport-error
  states are declared and covered by a focused integration test. Browser
  comparison evidence for this slice is still pending.
- This is one bounded action only; the full manufacturing readiness gate below
  remains open until the other source actions, view modes, integrations,
  permissions, and paired browser evidence are complete.

This is the complete implementation sub-plan for the Core3 `manufacturing`
service. It is plan-only: it does not change product code, install Odoo
addons, or commit images. `ready` is intentionally withheld until the live
addon is installed and the desktop/mobile reference captures and navigation
evidence below exist.

## Reference and evidence boundary

- Odoo source: `/home/nhanjs/projects/odoo`, revision `659759969d535d286b656c96b675e4612b925ddd` (short `65975996`), branch `19.0`.
- Addon: `/home/nhanjs/projects/odoo/addons/mrp`, manifest version `2.0`, name
  `Manufacturing`, application `true`, category `Supply Chain/Manufacturing`,
  dependencies `product`, `stock`, and `resource`.
- Official demo data is declared by the manifest: `data/mrp_demo.xml`. The
  normal data list includes `data/mrp_data.xml`, all MRP menus/views, wizard
  views, report views, and backend assets `mrp/static/src/**/*`.
- Live authenticated check on 2026-09-10: `http://localhost:8069`, database
  `core3_owned`, user `codex@core3.local`. Odoo server is `19.0-20260908` and
  `ir.module.module.search_read` returned `name=mrp`, `state=installed`,
  `latest_version=19.0.2.0`, `demo=true`. The menu resolves to action 876 and
  the rendered action URL is `/odoo/boms`; the desktop action exposes List and
  Kanban view switches and the form opens at `/odoo/boms/1`.
- Paired authenticated BOM evidence for this bounded slice is recorded below;
  all image files remain under `/tmp` and are intentionally not committed.

## Gate 1 - addon, manifest, version, and demo status

The source manifest is authoritative for addon scope. It loads security,
digest/mail subtype/template data, MRP base data, all listed view and wizard
XML, reports, and `mrp_demo.xml` only when the database is created with demo
data. The source demo file contains products/components, BOMs, work centers,
operations, manufacturing orders, stock moves/quantities, and transitions
used to make the operations screens non-empty. Do not copy transient source
dates or random database IDs; use stable Core3 fixtures described below.

The owned reference is installed with official demo data. Full manufacturing
readiness remains open because the other Manufacturing actions in this plan are
not yet implemented as paired slices.

## Gate 2 - complete visible menu, action, route, and view inventory

The following is the source contract. Routes are the Odoo web client route
slugs to record after authenticated menu navigation; action IDs and view modes
are the stable source identifiers. A source action with no menu is still listed
because it is reachable from a button, dashboard, product, stock, or wizard.

### Menu tree and menu actions

| Menu path | Source menu | Action / route | Access |
| --- | --- | --- | --- |
| Manufacturing | `menu_mrp_root` | app root `/odoo/manufacturing` | `group_mrp_user`, `group_mrp_manager` |
| Manufacturing / Operations / Manufacturing Orders | `menu_mrp_production_action` | `mrp_production_action` / `/odoo/manufacturing-orders` | MRP user |
| Manufacturing / Operations / Work Orders | `menu_mrp_workorder_todo` | `mrp_workorder_todo` / `/odoo/work-orders` | `group_mrp_routings` |
| Manufacturing / Operations / Unbuild Orders | `menu_mrp_unbuild` | `mrp_unbuild` / `/odoo/unbuild-orders` | MRP user |
| Manufacturing / Operations / Scrap | `menu_mrp_scrap` | `stock.action_stock_scrap` / stock scrap route | stock user |
| Manufacturing / Planning | `mrp_planning_menu_root` | scheduler server action, no ordinary view | `base.group_no_one` |
| Manufacturing / Products / Bills of Materials | `menu_mrp_bom_form_action` | `mrp_bom_form_action` / `/odoo/bills-of-materials` | MRP user |
| Manufacturing / Products / Products | `menu_mrp_product_form` | `product_template_action` / product route | product user |
| Manufacturing / Products / Product Variants | `product_variant_mrp` | `mrp_product_variant_action` / product variant route | `product.group_product_variant` |
| Manufacturing / Products / Lots/Serial Numbers | `menu_mrp_traceability` | `stock.action_production_lot_form` / stock lot route | `stock.group_production_lot` |
| Manufacturing / Reporting / Work Orders | `menu_mrp_work_order_report` | `mrp_workorder_report` / `/odoo/work-orders-analysis` | routings group |
| Manufacturing / Reporting / Overall Equipment Effectiveness | `menu_mrp_workcenter_productivity_report` | `mrp_workcenter_productivity_report` / `/odoo/oee` | routings group |
| Manufacturing / Configuration / Operations | `menu_mrp_routing_action` | `mrp_routing_action` / `/odoo/operations` | manager + routings |
| Manufacturing / Configuration / Work Centers | `menu_view_resource_search_mrp` | `mrp_workcenter_action` / `/odoo/work-centers` | manager + routings |
| Manufacturing / Configuration / Settings | `menu_mrp_config` | `action_mrp_configuration` / settings action | `base.group_system` |

The source also exposes `mrp_workcenter_productivity_report_oee` (Overall
Equipment Effectiveness), `mrp_workcenter_productivity_report_blocked`
(Productivity Losses), `mrp_workorder_workcenter_report` (Work Orders
Performance), `mrp_workorder_action` variants, inventory-move and stock
replenishment actions, and `mrp_operation_picking` under Inventory / Transfers.
These are cross-module or button/report surfaces and must be mapped explicitly
as supported, deferred, or hidden; never silently replace them with a fake MRP
route. The source report actions are Production Order, BoM Overview, MO
Overview, Finished Product Label (ZPL/PDF), and Work Order.

### Action view modes and view states

| Surface / action | Model | Modes | Required states and controls |
| --- | --- | --- | --- |
| Manufacturing Orders / `mrp_production_action` | `mrp.production` | `list,kanban,form,calendar,pivot,graph,activity` | To-do default, search/filter/group, plan, availability, confirm, produce, cancel, split, merge, lock, scrap, labels, unreserve |
| Manufacturing Orders dashboard variant | `mrp.production` | `list,kanban,form` | picking-type domain/context and planned/waiting/in-progress/to-close cards |
| Manufacturing Order form | `mrp.production` | `form` | statusbar draft/confirmed/progress/to-close/done/cancel, components, work orders, by-products, miscellaneous, chatter, stock/traceability stat buttons |
| Work Orders / `mrp_workorder_todo` | `mrp.workorder` | `list,kanban,form,calendar,pivot,graph` | waiting/ready/progress/finished/blocked, start, pause, block, continue, cancel, plan |
| Work-order reports | `mrp.workorder` | graph/pivot/list/form and list/form/calendar/pivot/graph | work center, operation, production, duration, state, date measures/grouping |
| Bills of Materials / `mrp_bom_form_action` | `mrp.bom` | `list,kanban,form` | search, components, operations, by-products, miscellaneous, BoM overview, routing-time button |
| BoM form | `mrp.bom` | `form` | product/type, quantity/UoM, components inline list/catalog, operations, by-products, attachments, company, validity/effectivity |
| Operations / `mrp_routing_action` | `mrp.routing.workcenter` | `list,kanban,form` | operation, work center, duration, worksheet, dependencies, active/archive |
| Work Centers / `mrp_workcenter_action` | `mrp.workcenter` | `list,kanban,form` | capacity, calendars, alternatives, productivity and work-order stats |
| Work Centers overview | `mrp.workcenter` | `kanban,form` | cards for planned, ready, progress, late, and availability links |
| OEE / productivity | `mrp.workcenter.productivity` | `graph,pivot,list,form` | productivity, losses, work center, operator, duration, date grouping |
| Unbuild Orders / `mrp_unbuild` | `mrp.unbuild` | `list,kanban,form,activity` | draft/done/cancel, unbuild, product, MO, lot/serial, component moves |
| Stock Moves / `action_mrp_production_moves` | `stock.move.line` | `list,form` | raw/finished moves, quantities, lots/serials, reservations |
| Settings / `action_mrp_configuration` | `res.config.settings` | `form` | MRP configuration controls, manager/system access, save/reset |

Named source view records to preserve are `mrp.production` activity/list/form/
kanban/calendar/pivot/graph/search; `mrp.bom` form/list/kanban/search and BOM
line form; routing list/form/kanban/search; workorder editable/list/form/
calendar/graph/pivot/kanban/search; workcenter list/kanban/form/search; OEE
productivity list/form/graph/pivot/search and loss list/form/kanban/search; and
unbuild search/list/kanban/form (including simplified form). Inherited product,
stock picking, stock move, stock rule, stock scrap, warehouse, product-document,
and settings views are integration contracts, not permission to duplicate those
other modules inside Manufacturing.

## Gate 3 - route and screenshot evidence

Required capture matrix for the full module remains broader than this bounded
slice. The completed Bills of Materials pair is:

| Viewport | Required evidence |
| --- | --- |
| Desktop 1440x900 | Odoo action 876 list, kanban, and populated form; Core3 `/manufacturing/boms` list, kanban, and detail/form |
| Mobile 390x844 touch | Odoo action 876 list, kanban, and populated form; Core3 responsive list/kanban/detail/form with icon controls, quantity/UoM, references, and no horizontal overflow |

For every capture record Odoo action ID, resulting browser URL, model, view
mode, fixture/data state, viewport, and `/tmp` path. A screenshot from another
module, an uninstalled route, or synthetic HTML is not acceptable.

## Gate 4 - Core3 datasource, deterministic fixtures, and API contract

The existing service is `sdk/bun/sample/services/manufacturing`: manifest menu
entries for four routes, permissions `manufacturing.read/write/manage`, DuckDB
storage, migrations `0.0.1` through `0.0.5`, and pages for orders, detail, BOMs,
analysis, and a production workflow. The BOM page no longer embeds SQL; its
list/detail API fragments own the datasource queries and mutations.

Before implementation, move backend SQL, lookups, mutations, and workflows into
convention-discovered `services/manufacturing/api/` fragments keyed by `page.id`;
page YAML must remain presentation-only and API fragments must not be listed as
frontend pages. Use service operations for product, stock, lot, user, company,
and work-center relations; never cross-service SQL.

Every list, form, kanban, calendar, chart, pivot, activity, report, dashboard,
and empty state needs a named backend datasource with `mock_data` (the parent
register references `screen-mock-data.md`, which is absent in this worktree;
the implementation must restore or otherwise adopt that shared contract).
Fixture modes must include `default`, `empty`, `filtered`, `error`, and
`forbidden`, with stable IDs, seeded date `2026-01-15`, stable ordering, and no
`CURRENT_DATE`, `CURRENT_TIMESTAMP`, random UUID, browser-only fixture, remote
asset, or page-local record.

Minimum fixture model:

- products/variants and UoMs; two companies; warehouses/locations; users and
  MRP roles; work centers, calendars, operations, worksheets;
- at least four BOMs with components, operations, by-products, versions,
  archived/active and multi-company cases;
- MOs in draft, confirmed, progress, to-close, done, and cancelled states;
  raw/finished moves, reserved/unreserved, lots/serials, backorder and scrap;
- work orders in waiting, ready, progress, finished, blocked, and cancelled;
  planned/unplanned, late, duration, productivity and loss rows;
- unbuild rows, activities/chatter/attachments, and a deliberately empty MO,
  BOM, work-order, OEE, pivot, graph, calendar, and report result.

API actions must cover create/edit/archive/duplicate where visible, component and
operation line editing, confirm/plan/start/pause/block/continue/produce/close/
cancel/unbuild/split/merge/lock/scrap/labels, availability/reservation,
serial assignment, settings, and report filters. Responses must be stable and
include explicit `401`, `403`, `404`, `409` row-version conflict, and `422`
validation cases. All writes need permission checks, company scope, audit/
chatter events, idempotency, and deterministic refresh sources.

## Gate 5 - shared primitives

Record and reuse these primitives before any manufacturing-specific renderer:
`ListView`, responsive `Kanban`, `FormView`/`OdooFormView`, inline one-to-many
grid and many2one selector, statusbar/status chip, search/filter/group-by,
optional columns, row actions and bulk actions, Calendar, Activity, Pivot,
Chart, report/dashboard/stat cards, tabs/notebook, dialogs/wizards,
attachments/chatter/activities, archive/restore, lot/serial picker, quantity/UoM
editor, and responsive overflow/mobile action menus. Extend a generic primitive
when another module needs it; do not add an MRP-only substitute without recording
the reusable contract and its tests here.

## Gate 6 - acceptance checks and readiness rule

Implementation acceptance must prove, with focused YAML/discovery/service tests
and authenticated browser checks:

- every menu/action/view mode above is supported, deliberately deferred, or
  deliberately hidden with an explanation; no silent route alias;
- fresh install and upgrade are idempotent for DuckDB and supported adapters,
  fixtures are deterministic, page/API separation is valid, and all datasource
  permissions are declared;
- desktop and mobile navigation, search, filters, group-by, sorting, pagination,
  view switching, inline lines, form save/discard, valid and invalid workflow
  actions, reports, empty/loading/error/forbidden states, notifications, and
  no-horizontal-overflow pass; browser network failures are captured;
- ordinary MRP user, routing user, manager, system/settings user, another
  company, and denied user boundaries match Odoo source groups and record rules;
  forbidden mutations stay forbidden and cross-company records stay isolated;
- Odoo and Core3 screenshots are paired by action/mode/state at 1440x900 and
  390x844, stored under `/tmp` only, and no image is committed.

Readiness is `ready` only after the live `mrp` addon is installed, its menus and
views are navigated in an authenticated browser, both Odoo screenshot paths
exist, and all focused validation commands pass. Until then this artifact is
complete as a plan but remains `blocked` and must not authorize implementation.

## Planned focused validation

From `sdk/bun/sample` after implementation:

```sh
bun run audit
bun test test/manufacturing*.test.ts
bun run build:css
git diff --check
```

Also run the module discovery/YAML validator, fresh-install and upgrade matrix,
and the authenticated Playwright desktop/mobile matrix described above. The
current plan-only validation is limited to source/register/service inspection,
the authenticated live addon status query, and Markdown whitespace validation.

## 2026-09-11 bounded Manufacturing Products follow-up

- The selected uncovered menu/action is Manufacturing / Products / Products.
  In the Odoo 19 source checkout at `/home/nhanjs/projects/odoo`, the exact
  definitions are in `addons/mrp/views/product_views.xml`: search view
  `mrp_product_template_search_view` (model `product.template`, inheriting
  `product.product_template_search_view`) adds the `Manufactured Products`
  domain `[('bom_ids','!=',False)]` and `BoM Components` domain
  `[('bom_line_ids','!=',False)]`; action `product_template_action` is named
  `Products`, uses model `product.template`, route state `manufacturing-products`,
  view modes `kanban,list,form`, search view `mrp_product_template_search_view`,
  and context `{"search_default_goods":1,"default_is_storable":true}`; menu
  `menu_mrp_product_form` is named `Products`, parented by `menu_mrp_bom`, and
  has sequence 1. The authenticated `core3_codex_demo` runtime resolved the
  action to ID 801 and menu to ID 526. The direct source route is
  `/odoo/manufacturing-products` and a product record opens directly at
  `/odoo/manufacturing-products/23`.
- Source interaction evidence: Odoo opens the Products action in Kanban with
  87 live products, cards showing product name, variants, price, and on-hand
  quantity; List is a visible alternate tab. Search/filter behavior includes
  product type, Manufactured Products, BoM Components, active/archived state,
  and the inherited goods filter. A card opens the product form with the
  visible tabs `General Information`, `Attributes & Variants`, `Sales`, `Point
  of Sale`, `Purchase`, and `Inventory`; the form also exposes product type,
  invoicing policy, inventory tracking, quantities, prices, taxes, category,
  company, and internal notes.
- Core3 implements the bounded slice at `/manufacturing/products` with a
  direct detail route `/manufacturing/products/detail?id=mrp-product-desk`.
  Implementation checkpoint: `1ea6f476`
  (`feat(manufacturing): add products parity slice`).
  `pages/products.yaml` and `pages/product-detail.yaml` are presentation-only;
  `api/products.yaml` and `api/product-detail.yaml` own page-id-bound sources,
  CRUD/archive/delete/message actions, permissions, 401/403/404/409/422/503
  contracts, and row-version conflict handling. Migration `0.0.16` creates
  deterministic, idempotent `mrp_products` and `mrp_product_messages` fixtures
  with 11 products, active/archived and manufactured/component cases, fixed
  `2026-01-15` timestamps, and stable IDs. The manifest adds Products under
  Manufacturing Master Data with `manufacturing.read` permission.
- Focused coverage is `test/manufacturing_products.integration.test.ts`: the
  helper migrates only migration 016 into a temporary database twice, avoiding
  the full-service startup cost while still proving migration idempotency. The
  normal command `bun test test/manufacturing_products.integration.test.ts`
  passes 3 tests / 43 assertions in under the default 5-second test timeout
  (the explicit `--timeout 5000` run also passes). Coverage includes page/API
  ownership, source modes/menu/permissions, deterministic search/filter/detail
  and message data, empty/transport states, create/edit/stale-write/duplicate,
  archive, delete, and in-use guards.
- Authenticated paired captures were taken with safe Playwright scripts using
  `fullPage: false`, exact 1440x900 and 390x844 viewports, and no committed
  images. Source captures:
  `/tmp/odoo-manufacturing-products-desktop-1440x900.png`,
  `/tmp/odoo-manufacturing-products-mobile-390x844.png`,
  `/tmp/odoo-manufacturing-products-desktop-form-1440x900.png`, and
  `/tmp/odoo-manufacturing-products-mobile-form-390x844.png`. Core3 captures:
  `/tmp/core3-manufacturing-products-desktop-1440x900.png` (Kanban),
  `/tmp/core3-manufacturing-products-desktop-list-1440x900.png`,
  `/tmp/core3-manufacturing-products-desktop-form-direct-1440x900.png`,
  `/tmp/core3-manufacturing-products-mobile-390x844.png`, and
  `/tmp/core3-manufacturing-products-mobile-form-direct-390x844.png`.
  The final mobile detail capture uses a storage state seeded from the live
  Core3 login response, waits for `/api/auth/me` and visible `Desk Combination`
  detail content before capture, and is populated/styled rather than shell-only.
  Final Core3 hashes are `772aeeb3d09fad1ea86dedae46f2a60cbbbba4afb8a543063f573d9e9215a505`
  (desktop Kanban), `6b55bcb061d7e8046b072b5feb3fb51ae6ae190e181c6033bfceafbcc3bc1699`
  (desktop List), `e97576b9d16e968bd278b8f16b722dde6b0a12a6dd2acfa55f7deebe05edbfbd`
  (desktop direct form), `d29c273e1df35584fcd54dd45c25118bc945e9b7abeba480afedc859dcaf5dd9`
  (mobile Kanban), and `6fe7a0f3a8379887e7d4a38d9e6b93f329ca9f73776c50e55776cd186512baf7`
  (mobile direct form).
- Final browser verification reported no page errors, no failed requests, and
  no horizontal overflow: `scrollWidth` equaled the viewport width at both
  sizes. Global and Manufacturing CSS were rebuilt before the capture pass.
  Remaining bounded differences are the shared Fluent shell versus Odoo's
  purple shell, 11 deterministic Core3 fixtures versus Odoo's 87 live rows,
  and the shared card renderer's desktop single-click selection behavior;
  direct detail routing and double-click navigation remain valid. Cross-module
  forecast/document/reordering workflows and full variant editing remain
  outside this slice.

## 2026-09-11 bounded Product Variants follow-up

- The selected uncovered visible action is Manufacturing / Products / Product
  Variants. The fresh authenticated Odoo 19 stack at `http://localhost:8069`
  resolves runtime action `674`, model `product.product`, and modes
  `kanban,list,form`; the source XML definitions are `mrp_product_variant_action`
  and `product_variant_mrp` in `addons/mrp/views/product_views.xml`. The live
  action opens at `/odoo/action-674`, shows `1-80 / 192`, and exposes New,
  Product Variants, Kanban, and List. Its editable variant form exposes
  Product, Product Type, Sales Price, Sales Taxes, Cost, Internal Reference,
  Barcode, Purchase Taxes, Category, Company, General Information, Purchase,
  and internal notes/chatter.
- This action was not present in Manufacturing source or history. The nearby
  Manufacturing Lots / Serial Numbers action was excluded because the
  repository already implements that action in the Inventory lots slice.
- Core3 implements the bounded action at
  `/manufacturing/product-variants` with detail
  `/manufacturing/product-variants/detail?id={id}`. Pages
  `product-variants.yaml` and `product-variant-detail.yaml` are
  presentation-only; `api/product-variants.yaml` and
  `api/product-variant-detail.yaml` own page-id-bound queries and mutations.
  The manifest adds Product Variants under Manufacturing / Master Data. The
  list provides source-visible Kanban-first and List modes, search by
  product/reference/barcode/attribute, Product Type and Active/Archived
  filters, and responsive mobile Kanban. The detail form covers the visible
  source fields, General Information/Purchase/INTERNAL NOTES tabs, stat
  buttons, edit/archive/delete, and messages.
- Migration `0.0.17` seeds 14 deterministic variants dated `2026-01-15`,
  including multi-attribute desks, chairs, screens, stocked/history-bearing
  records, and one archived legacy component. The API declares explicit 401,
  403, 404, and 503 states. Mutations cover create/edit, required-field and
  non-negative numeric validation, duplicate variant detection, row-version
  stale rejection, archive idempotency, in-use delete protection, and
  manufacturing.read/write/manage permission boundaries.
- Authenticated source captures are under `/tmp` and are not committed:
  `/tmp/odoo-manufacturing-product-variants-desktop-{kanban,list,form}-1440x900.png`
  and `/tmp/odoo-manufacturing-product-variants-mobile-{kanban,form}-390x844.png`.
  Odoo mobile resolves this action to Kanban and does not expose the List
  switch at 390px. SHA-256 hashes are:
  `b347bc854e32143664562070d9a8911aed9a7c4be17b4fcf6e750adb29125303`
  (desktop Kanban),
  `81429ef819bf3e15273ad3f5890efdd39447fa596aaf61e1d0b1b17deed28d96`
  (desktop List),
  `7ec8e9802f54550d911040b45fee01960d6aae92f7d93962778eff8631de6f5f`
  (desktop form),
  `02ab1ab449693e37f7b991501fec91d7952d9b94db0a740d53083dabd802e099`
  (mobile Kanban), and
  `09314abb4b80075be52d2f0bc298f0f244962ebe44d00700bab8bd882857999`
  (mobile form).
- Authenticated Core3 captures are under `/tmp` and are not committed:
  `/tmp/core3-manufacturing-product-variants-desktop-{kanban,list,form}-1440x900.png`
  and `/tmp/core3-manufacturing-product-variants-mobile-{kanban,form}-390x844.png`.
  The browser pass authenticated as `admin@tms.local`, exercised the route,
  List switch, `FURN_0096` reference search, and populated detail route. Both
  viewports reported exact document/body width equal to the viewport (`1440`
  and `390`) with no page errors. SHA-256 hashes are:
  `06dcc0358107d0ef28c5f245dcb5c1ee158f282c918922a1dee6e318df7b22cd`
  (desktop Kanban),
  `d9611b1e9535a96e9a17fcd250e4854ca68b3c174ea0cd5b77921985a308d5b9`
  (desktop List),
  `8f626a572fd08d204ab8f1fa36560dbf028585ba78c7e947c8bc0948d1e70b8a`
  (desktop form),
  `091576d4a014008b3b969c889eca6ec0bdb72a617a3689f8451ae3ff31a91641`
  (mobile Kanban), and
  `bd06e611012e6bf9cdd770a05565c1ccced82b53fdb2d4d7a59ac18b6a26023d`
  (mobile form).
- Visual comparison found and fixed one parity issue: Core3 initially added
  synthetic Product Template Kanban columns, while Odoo renders a flat
  four-column Kanban grid. The page now uses the renderer's explicit empty
  `group_by` contract for the ungrouped source state. Remaining bounded
  differences are Odoo's purple shell and live 192-row dataset versus the
  shared Fluent shell and 14 deterministic fixtures, plus shared Core3
  form/chatter rendering. Product template workflows, attribute editing, and
  downstream stock/sales integrations remain outside this bounded action.
- Commits: `bd1a8b77` (page/API contract), `58e635e5` (fixtures, mutations,
  and focused test), `945d344d` (visual Kanban refinement), and the separate
  documentation/evidence commit recorded after this entry. The focused suite
  is `test/manufacturing_product_variants.integration.test.ts`.

## Work Orders performance report bounded slice (2026-09-12)

The selected Work Center action is the Odoo Work Orders performance report:
Core3 adds `/manufacturing/work-orders-performance` with graph, pivot, list,
and read-only form modes. The query is scoped to the active work center and
completed work orders, with deterministic fixtures and explicit
`manufacturing.read` access. The focused integration test passes 2 tests and
16 assertions.

Authenticated captures for the performance report were saved at both required
viewports under `/tmp/core3-odoo-parity/manufacturing-next-20260912/`, including
`core3-performance-desktop-1440x900-final.png`,
`core3-performance-mobile-390x844-final.png`,
`odoo-performance-desktop-1440x900.png`, and
`odoo-performance-mobile-390x844.png`. Images remain outside Git. The source
action and bounded report surface were verified; the live reference had no
completed rows for the selected report, so no populated-result parity is
claimed. The remaining visual difference is the shared Core3 Fluent shell
versus Odoo's purple shell.

The source search contract is also represented in the report refinement: Work
Center, Manufacturing Order, Product, and Finished/Status filtering, with Work
Center, Operation, Manufacturing Order, Status, and Date grouping. The API
keeps the source action's completed-work-order domain and adds deterministic
Manufacturing Order/Product option datasources and equality filters. The focused
test now passes 2 tests and 19 assertions. The isolated runtime could not be
reached for fresh authenticated captures: frontend startup hit the host
`EMFILE` watcher limit and the DuckDB migration runner rejected an existing
constrained `ALTER TABLE`, so no new visual signoff or image claim is made.

## Work Center Loads bounded slice (2026-09-12)

Core3 adds the Work Center `Load` stat action at `/manufacturing/work-centers/load`, with page/API YAML joined by `page.id`, deterministic read-only load-report fixtures, work-center scoping, `manufacturing.read` permissions, and explicit empty/error/forbidden states. The focused test passes 2 tests and 15 assertions.

Core3 captures are under `/tmp/core3-odoo-parity/manufacturing-batch4-20260912/`; the live Odoo report was source-confirmed but the selected reference had no populated load rows, so no populated-result or complete paired visual claim is made. Images remain outside Git.

## BoM Overview bounded action (2026-09-12)

Local Odoo source inspection identified `mrp.action_report_mrp_bom`, a client
action with tag `mrp_bom_report`, launched by the BoM form stat button. Its
source component renders BoM quantity and a recursive component table with
Availability, Unit Cost, BoM Cost, and Operations. It has no standalone menu.

Core3 replaces the former synthetic Production Analysis target with the
module-qualified `/manufacturing/boms/detail/overview` page. The BoM detail
button passes its selected `id`; presentation is in `pages/analysis.yaml` and
the page-id-bound summary, component, and operation datasources are in
`api/analysis.yaml`. Migration `20260912030000-019-bom-overview.yaml` adds
fixed availability and unit-cost fixtures to existing BoM lines and is
idempotent. Read access is `manufacturing.read`; the API declares 401/403/404
and 503 states, while the focused test verifies page ownership, idempotent
migration, deterministic populated/empty/missing/error data, and permissions.

The first attempted test from `sdk/bun/sample` failed because that working
directory cannot resolve the workspace alias `@core3/server/database/duckdb-database`.
Running from the expected `sdk/bun` root after frozen-lockfile installation
passed the contract test; this invocation limitation is retained as an
evidence note. Authenticated desktop/mobile capture was attempted under
`/tmp/core3-odoo-parity/manufacturing-batch5-20260912/`; the environment did
not expose a usable interactive browser session in this worktree, so no visual
signoff or image files are claimed. The action remains bounded: recursive
multi-level costing, print/PDF export, and Odoo chatter are not synthesized.

## Manufacturing Order Overview bounded action (2026-09-12)

- Local Odoo source inspection identified `action_report_mo_overview` in
  `addons/mrp/views/mrp_production_views.xml`: a client action named `MO
  Overview`, tag `mrp_mo_overview`, model `mrp.production`, launched by the
  Manufacturing Order form stat button labelled `Overview`. The source OWL
  action renders `Print` and `Unfold` controls, display options for
  replenishments, availabilities, receipts, unit/MO/BoM/real costs, and a
  responsive overview table with Status, Quantity, Free to use / On Hand,
  Reserved, Receipt, Unit Cost, MO Cost, BoM Cost, and Real Cost columns. It
  expands Components, Operations, By-products, and a Cost Breakdown section.
  The action is record-scoped and has no standalone menu.
- Core3 adds the read-only `/manufacturing-orders/detail/overview` page. The
  MO form now exposes the exact `Overview` stat button; its action and the
  overview page are joined through the selected MO `id`. Presentation remains
  in `pages/manufacturing-order-overview.yaml`; the four page-id-bound
  datasources and `Print`/`Unfold` actions are in
  `api/manufacturing-order-overview.yaml`. Existing deterministic production,
  move, and work-order fixtures provide populated and empty breakdown states;
  all sources require `manufacturing.read` and declare 401/403/404/503
  boundaries. No mutation is exposed because the Odoo client action is a
  report/read-only surface.
- Focused coverage is
  `test/manufacturing_order_overview.integration.test.ts`: 2 tests and 14
  assertions pass. It verifies page/API separation, route discovery, stat
  navigation, populated components/operations, empty and not-found fixture
  behavior, transport failure, and permission contracts. The UI audit passes
  with 603 pages, 611 routes, and 1,041 datasources; ESLint and
  `git diff --check` pass.
- Authenticated Core3 and Odoo desktop 1440x900 plus mobile 390x844 captures
  were attempted under `/tmp/core3-odoo-parity/manufacturing-next-20260912/`.
  No image or visual claim is made: the Core3 runtime could not start because
  Vite hit `EMFILE: too many open files` while watching `vite.config.ts`, and
  the DuckDB migration runner separately failed with `Parser Error: Adding
  columns with constraints not yet supported` on an existing constrained
  `ALTER TABLE`. The capture blocker is environmental and remains explicit.
- This bounded slice does not synthesize Odoo's recursive server report/PDF,
  interactive column display menu, chatter, or cross-module stock costing.
