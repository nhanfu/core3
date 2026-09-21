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
