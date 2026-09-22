# Website parity — Page Manager slice

## Scope and source trace

This bounded slice implements the authenticated Website Page Manager, using the
local Odoo 19 `addons/website` source as a behavioral and visual reference. The
addon manifest is `website/__manifest__.py`; its official demo data includes
website records and demo pages in `data/website_data.xml` and
`data/website_demo.xml`.

The exact source-backed entry is:

`Website` (`website.menu_website_configuration`, sequence 95) → `Site`
(`website.menu_site`, sequence 10) → `Content` (`website.menu_content`,
sequence 30) → `Pages` (`website.menu_website_pages_list`, sequence 10) →
`action_website_pages_list`. The action targets `website.page`, has path
`website-pages`, and declares `list,kanban` view order. It binds
`website_pages_tree_view` (`Page Title`, `Page URL`, `Indexed`, `Is In Main
Menu`, `Is SEO Optimized`, `Is Published`) and `website_pages_kanban_view`
(page title, URL, menu/SEO indicators, and Published/Not Published state).
The search view supplies Published, Not published, Tracked, Not tracked, and
Not SEO optimized filters. Core3’s bounded contract keeps the available status
filter and adds explicit List/Kanban text tabs; tracking is outside this slice.

Odoo’s manager is editor/designer controlled. Core3 maps read visibility to
`website.read`, creation and publishing to `website.write`, and unpublishing to
`website.manage`. Public website rendering and the drag/drop Website Editor are
not included.

## Core3 contract

- Presentation-only page YAML: `services/website/pages/pages.yaml`.
- Backend datasource/action YAML: `services/website/api/pages.yaml`, joined by
  `page.id: website-pages`.
- Deterministic fixtures: `Core3 Storefront` with published `Home` (`/`, in
  main menu, SEO optimized) and draft `Contact us` (`/contactus`, in main menu).
- Schema compatibility migration: `20260912120000-003-page-manager.yaml`.
- Empty state: `No pages found` with search-specific explanatory text.
- Validation/error paths: required Website, Page Title, and Page URL fields;
  invalid website returns HTTP 400; publish/unpublish workflow guards return
  HTTP 409 for invalid state and actions are permission-bound.

## Acceptance and evidence

- Focused integration coverage verifies page/API joining, `/website-pages`
  discovery, deterministic rows, search/status empty branches, exact visible
  labels, and permission boundaries.
- Required visual evidence paths are under `/tmp/core3-odoo-parity/website-page-manager`:
  `odoo-desktop.png`, `odoo-mobile.png`, `core3-desktop.png`, and
  `core3-mobile.png`.
- Browser captures must use the authenticated Odoo reference from the parent
  plan and authenticated Core3 at 1440x900 and 390x844. If either runtime is
  unavailable, the blocker and omitted comparison claim must be recorded here.

### Wave 2 execution evidence — 2026-09-12

The focused tests and shared UI audit pass. Odoo itself responds at
`http://127.0.0.1:8073`, but the supplied authenticated session redirects both
`/odoo/website-pages` attempts to `/odoo/discuss`; the authenticated shell only
exposed Discuss/Channels and no Website menu. The attempted desktop and mobile
images are retained under `/tmp/core3-odoo-parity/website-page-manager/` as
diagnostic artifacts, not as Website reference captures.

Core3 could not reach a browser route. Startup fails during YAML API loading on
the pre-existing unrelated error `Named action sms_marketing.mailings.cancel
permission does not match its workflow transition` in
`services/sms-marketing`; therefore no Core3 images were produced and this
slice makes no visual-parity claim. Fixing that unrelated service is outside
this bounded Website change.

### Wave 3 execution evidence — 2026-09-12

The next uncovered source entry after Page Manager is `Website > Site > Homepage`
(`menu_website_preview`, sequence 10), which invokes the `website_preview` client
action (`Website Preview`, path `website`, tag `website_preview`). Core3 adds the
permissioned `website-homepage` page and its `open_website_homepage` client-action
contract. The established Core3 `/website` route is already the Websites list, so
`/website-homepage` is a deliberate route alias; the source menu/action identity
and ordering remain recorded here. The preview uses a safe YAML text tree and a
deterministic Core3 Storefront homepage state. Menu Editor (sequence 20) is now
implemented as a permissioned, persistent YAML CRUD slice with desktop/mobile
authenticated browser evidence recorded in the Website QA ledger.

Focused Website tests pass (6 tests, 27 assertions). The required authenticated
desktop/mobile captures were attempted but not produced: Playwright/js_repl was
unavailable, Odoo redirected the unauthenticated `/odoo/website-pages` probe to
`/web/login`, and Core3's prescribed startup encountered existing port
contention (`3001`) with the fallback Vite process unavailable (`EMFILE`). No
visual-parity claim is made and no screenshot files were added.

## Follow-up

Website preview/Homepage, themes, SEO filters, tracked pages,
page publish/unpublish browser workflow, import/export, and public/portal page
rendering remain separate slices. No Odoo frontend code is copied.

## Wave 4 execution evidence — 2026-09-21 — Website Analytics

The next uncovered source entry after Page Manager and Homepage/Menu Editor is
`Website > Reporting > Analytics` (`website.menu_reporting` sequence 30 →
`website.menu_website_analytics` sequence 10). Odoo binds that entry to the
`backend_dashboard` client action at path `website-analytics`; the dashboard
fetches the current website, permitted website choices, designer/system group
state, and an optional Plausible share URL through
`/website/fetch_dashboard_data`. When no Plausible share URL is configured, the
Odoo template renders `Easily track your visitor with Plausible`,
`How to connect Plausible ?`, and a `Go to Website` control.

Core3 now provides the same source-backed route/menu identity through a
presentation-only `pages/analysis.yaml` and a joined `api/analysis.yaml`.
Analytics are backed by the Website-owned `website_analytics_daily` table with
idempotent deterministic fixtures for Core3 Storefront and Core3 Docs. The
dashboard exposes Websites, Visitors, Visits, Page views, and Visits by date;
all read sources require `website.read`, and explicit forbidden/transport error
contracts are declared. This is a first-party durable read model for the
YAML-driven product and does not store Plausible credentials or copy Odoo
frontend code.

Focused coverage passes in
`test/website_analytics.integration.test.ts` (2 tests, 17 assertions),
including page/API separation and discovery, route/menu identity, idempotent
migrations, multi-site totals, daily traffic, empty state, and persisted rows.
The feature evidence is under
`odoo-ui-parity/evidence/website/2026-09-21/website-analytics-001/`.

Authenticated browser comparison is blocked. On browser instance `245ea108`,
the authenticated Odoo launcher exposed Discuss through Expenses but no Website
application; `/odoo/website-analytics` returned to Discuss. Core3 memory-mode
startup was also blocked by the unrelated pre-existing CRM discovery error
referencing `crm_lead_mining_request_detail` and four missing CRM actions, so
the Core3 route returned HTTP 502. Desktop/mobile diagnostic captures are
retained under `/tmp/core3-odoo-parity/`; they are not Website visual-parity
captures and no paired visual sign-off is claimed.

### Updated next slice

Themes, SEO filters, tracked pages, page publish/unpublish browser workflow,
import/export, and public/portal rendering remain open. Analytics is complete
for the bounded contract/runtime slice but not for module sign-off until the
Odoo Website installation/session and Core3 startup blockers are resolved.

## Wave 5 execution evidence — 2026-09-22 — Page tracking and SEO filters

The next uncovered bounded source feature is the Odoo Page Manager tracking
slice. Odoo 19 `website_pages_view_search` declares `Tracked`, `Not tracked`,
and `Not SEO optimized`; the Page Manager list carries the hidden `track`
field, and the `website.page`/`ir.ui.view` models persist the flag. Core3 adds
the durable `website_pages.track` column, deterministic tracked Home/Docs Home
and untracked Contact us fixtures, matching API filters, and `website.write`
permissioned edit persistence with row-version guards. Presentation remains in
`pages/pages.yaml` and `pages/page-detail.yaml`; datasources/actions remain in
the matching `api/pages.yaml` and `api/page-detail.yaml` contracts.

Focused coverage passes in
`test/website_page_tracking.integration.test.ts` (3 tests, 22 assertions),
and the full Website focused suite passes (27 tests, 145 assertions).
Migration replay and file-backed DuckDB restart preserve the flag and row
version. Feature evidence is under
`odoo-ui-parity/evidence/website/2026-09-22/website-page-tracking-001/`.

Core3 authenticated browser evidence was captured through the isolated Website
runner at `http://localhost:4320` on browser instance `245ea108`: the Page
Manager rendered its Tracking/SEO filter group and three durable rows at
desktop and mobile; captures are retained outside Git at
`/tmp/core3-odoo-parity/website-page-tracking/core3-desktop.png` and
`core3-mobile.png`. The shared authenticated Odoo session has no Website app;
the launcher stops at Expenses/Apps and `/odoo/website-pages` redirects to
Discuss at both viewports. Diagnostic captures are in the same temporary
directory. No paired Odoo visual-parity claim is made.

### Updated next slice

Themes, page publish/unpublish browser workflow, import/export, and
public/portal rendering remain open. SEO/tracking filter service/API and Core3
desktop/mobile rendering are covered by this bounded slice, but Website module
sign-off remains conditional on Odoo Website availability and the broader open
gates.

## Wave 6 execution evidence — 2026-09-22 — Theme Manager

The next genuinely uncovered bounded source feature is Odoo's Website Theme
Manager. Local Odoo 19 source `addons/website/views/website_views.xml` defines
`theme_install_kanban_action` (`Pick a Theme`) with the `theme_view_kanban`
cards, Theme and Category search fields, Author and Category grouping, and the
card actions `Use this theme`, `Update theme`, and `Remove theme`. The action is
launched from Website settings rather than a standalone Odoo menu. Core3 maps
that source action to `/website-themes`, adds a Website > Site > Themes entry as
a deliberate route alias, and adds a `Pick a Theme` action on the existing
Website detail form.

Core3 now provides page-only `pages/themes.yaml` and API/action-only
`api/themes.yaml`, joined by `page.id: website-themes`. Migration
`20260922110000-014-website-themes.yaml` adds the durable Website `theme_id`,
`theme_revision`, and theme catalog; `20260922111000-015-website-themes-demo.yaml`
seeds Core3 Storefront/Core3 Docs with distinct installed themes. Choosing,
updating, and removing a theme require `website.manage`, use Website row
versions, reject unavailable/duplicate/stale/not-selected transitions, and
persist through migration replay and file-backed restart.

Focused coverage passes in `test/website_themes.integration.test.ts` (6 tests,
35 assertions). Evidence is under
`odoo-ui-parity/evidence/website/2026-09-22/website-themes-001/`.

Authenticated Odoo desktop and mobile captures are retained in that folder and
show Discuss/OdooBot only; the launcher exposes no Website application or
Theme action for the shared actor, so paired Odoo Theme evidence is blocked.
The Core3 desktop attempt produced only a blank dark shell, and the browser
session was closed before a mobile attempt could be completed. No Core3 desktop
or mobile Theme Manager capture, and no paired visual-parity claim, is made.

### Updated next slice

Theme preview/form iframe behavior, theme asset installation effects, page
publish/unpublish browser workflow, import/export, and public/portal rendering
remain open. Theme catalog/assignment service/API/action persistence is covered
by this bounded slice only; Website module sign-off remains conditional on the
Odoo Website actor, Core3 mobile capture, and broader open gates.

## Wave 7 execution evidence — 2026-09-22 — Theme Preview and asset effects

The next bounded feature implements the Odoo `theme_view_form_preview` contract:
the `theme_install_kanban_action` form view is read-only, fullscreen, and
renders the theme `url` through an iframe. Core3 adds the permissioned
`/website-themes/preview` form page and API datasource, a row action from the
Theme Manager, and an `Open preview` client action that opens the selected
theme against the public Website preview boundary. Page and API YAML remain
separate and join by `page.id: website-theme-preview`.

The Odoo model source also shows that theme selection changes the current
Website's `theme_id` and reloads theme assets. Core3 models the durable visual
effect through Website-owned theme color tokens (`primary_color`,
`accent_color`, `surface_color`, and `text_color`) and applies only validated
hex colors to the public page root. Installed-theme state, preview-theme state,
theme revision, and public page scope are covered by migration replay and
file-backed restart assertions; no Odoo frontend code is copied.

Focused coverage passes in
`test/website_theme_preview.integration.test.ts` (3 tests, 21 assertions),
plus Theme Manager/public regressions (11 tests, 77 assertions across the
three-file scoped run). Feature evidence is under
`odoo-ui-parity/evidence/website/2026-09-22/website-theme-preview-001/`.

Browser comparison is blocked. The required borrow of the existing Odoo tab on
browser instance `245ea108` remained pending confirmation, while the available
authenticated Odoo tab exposed CRM rather than Website. No Odoo or Core3
preview screenshots were captured in this wave, so no visual-parity claim is
made. The existing Website reference blocker (authenticated actor has no
Website application) remains open.

### Updated next slice

Theme preview/form and public asset-token effects are covered at the
contract/data/runtime level. Page publish/unpublish browser workflow,
import/export, richer theme asset installation effects, and public/portal
rendering remain open; paired Odoo desktop/mobile evidence is still required.

## Wave 8 execution evidence — 2026-09-22 — Page Manager export

The next missing concrete Website action is the Page Manager export binding,
stable ID `WEBSITE-PAGE-EXPORT-001`. Odoo's
`action_website_pages_list` (`addons/website/views/website_pages_views.xml`)
opens the standard Web export flow for the `website.page` list/kanban action;
the shared implementation is in
`addons/web/static/src/views/view_hook.js` and
`addons/web/static/src/views/view_dialogs/export_data_dialog.xml`, with XLSX
as the direct-export format. Core3 already provides the shared ListView export
renderer, but Website Pages had no export action declaration.

Core3 now binds `website.pages.export` as a `website.read` client action in
`services/website/api/pages.yaml` and exposes the matching visible Export
toolbar action in `services/website/pages/pages.yaml`. The existing renderer
exports all rows matching the active Website Page Manager filters as XLSX,
using the declared Page Title, Page URL, Indexed, menu, SEO, and publication
columns. No schema or migration is needed for this read-only capability.

Focused coverage remains in `test/website_pages.integration.test.ts` and now
asserts the page/API action binding and read permission in addition to the
existing CRUD, workflow, stale, empty, and restart checks. Feature evidence is
under `odoo-ui-parity/evidence/website/2026-09-22/website-page-export-001/`.

Authenticated Odoo comparison is blocked in this wave: BrowserSkill instance
`245ea108` reported that the signed-in Odoo tab was already borrowed by another
active session (`ddkr`). The tab was not taken over or stopped. Consequently no
truthful Odoo desktop/mobile Page Manager export captures were available and no
visual-parity claim is made. Core3 captures are likewise omitted until the
shared tab/runtime can be owned without disrupting the other worker.

### Updated next slice

Website Page Manager import, page publish/unpublish browser proof, richer theme
asset installation effects, and public/portal rendering remain open. This
wave covers only the Website Page Manager export binding and does not claim
Website module completion.

## Wave 9 execution evidence — 2026-09-22 — Page Manager import

The next missing concrete Website action is the Page Manager import binding,
stable ID `WEBSITE-PAGE-IMPORT-001`. Odoo's `action_website_pages_list` targets
`website.page` with list and kanban views, so the standard Web import affordance
is available from that action. Core3 previously exposed only Page Manager
export; it now declares a visible `Import` header action and matching
`import_website_pages` YAML server form under the same `page.id:
website-pages` contract.

The bounded import accepts newline-separated
`Website ID|Page Title|Page URL|State|Indexed|In Main Menu|SEO Optimized|Tracked`
rows. Guards reject empty input, malformed rows, missing Website IDs, and
duplicate Website/URL rows before mutation. Valid rows upsert durably by
`(website_id, url)`, preserve the canonical Website name, and increment
`row_version` when an existing page is updated. The endpoint and visible action
require `website.write`; a read-only dispatcher request is covered by focused
integration coverage.

Focused coverage passes in `test/website_page_import.integration.test.ts`
(4 tests, 17 assertions). Evidence is under
`odoo-ui-parity/evidence/website/2026-09-22/website-page-import-001/`.

BrowserSkill instance `245ea108` was healthy, but borrowing the authenticated
Odoo tab `1770662590` returned `tab is borrowed by another session` with owner
`ftio`. The tab was not taken over or stopped. No Odoo desktop/mobile captures
were available, and no visual-parity claim is made.

### Updated next slice

Page publish/unpublish browser workflow, richer theme asset installation
effects, public/portal rendering, and paired Odoo desktop/mobile evidence
remain open. This wave covers only the Page Manager import action and does not
claim Website module completion.

## Wave 10 execution evidence — 2026-09-22 — Website Settings Identification

The next missing concrete Website action is Odoo's Website Settings entry,
stable ID `WEBSITE-SETTINGS-IDENTIFICATION-001`. Local Odoo 19 source
`addons/website/views/res_config_settings_views.xml` binds
`action_website_configuration` to `menu_website_website_settings`; its Website
app settings form includes the General Domain field and Website Identification
Name/Favicon controls. Core3 adds the deliberate `/website-settings` route and
Configuration > Settings menu alias, plus a Settings action on Website detail.

This bounded slice implements durable Name and Domain updates against the
existing `website_websites` rows. `services/website/pages/settings.yaml` is
presentation-only and `services/website/api/settings.yaml` owns the datasource
and save action, joined by `page.id: website-settings`. The `website.manage`
boundary, required Website name, http/https domain validation, stale row
version guard, per-site scope, and file-backed restart/migration replay are
covered. Favicon binary upload is explicitly not claimed here.

Focused coverage passes in `test/website_settings.integration.test.ts` (4
tests, 21 assertions). The shared SettingsView gained a styled text field
control because Odoo Website settings expose text inputs and the previous
primitive rendered all non-select/non-number settings as checkboxes.

BrowserSkill instance `245ea108` was healthy, but borrowing authenticated Odoo
tab `1770662590` returned the exact blocker `tab is borrowed by another session`
with owner `wabp`. The tab was not taken over or stopped. No truthful Odoo or
Core3 desktop/mobile captures were available, and no visual-parity claim is
made. Feature evidence is under
`odoo-ui-parity/evidence/website/2026-09-22/website-settings-identification-001/`.

## Wave 11 execution evidence — 2026-09-22 — Website Settings favicon

The next genuinely missing stable-ID Website feature after the completed page
import/export, settings name/domain, theme, analytics, tracking/SEO, content,
asset, and public slices was `WEBSITE-SETTINGS-FAVICON-001`. Odoo's Website
Identification setting exposes the editable binary `favicon` image field;
Core3 previously exposed only an informational placeholder.

Core3 now adds the page-only `SettingsView` image control and the matching API
upload action under `page.id: website-settings`. The Website migration adds
durable favicon metadata and bytes. Uploads require `website.manage`, validate
image MIME and 1 MB size limits, reject stale Website row versions, return a
data-URL preview, and expose exact bytes through the authenticated Website
favicon download route. Migration replay and file-backed DuckDB restart are
covered; no Odoo frontend code is copied.

Focused coverage passes in
`test/website_favicon_settings.integration.test.ts` (4 tests, 20 assertions),
and the existing Website Settings regression passes (4 tests, 21 assertions).
Evidence is under
`odoo-ui-parity/evidence/website/2026-09-22/website-settings-favicon-001/`.

Browser comparison is blocked because on BrowserSkill instance `245ea108`, the
authenticated Odoo tab `1770662590` was already borrowed by session `xigt`.
The worker did not take over or stop that session and did not use an
independent login. No truthful Odoo/favicon desktop or mobile captures are
available, so this wave makes no visual-parity claim.
