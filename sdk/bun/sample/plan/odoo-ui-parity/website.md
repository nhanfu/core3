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
deterministic Core3 Storefront homepage state; Menu Editor (sequence 20) remains
unimplemented.

Focused Website tests pass (6 tests, 27 assertions). The required authenticated
desktop/mobile captures were attempted but not produced: Playwright/js_repl was
unavailable, Odoo redirected the unauthenticated `/odoo/website-pages` probe to
`/web/login`, and Core3's prescribed startup encountered existing port
contention (`3001`) with the fallback Vite process unavailable (`EMFILE`). No
visual-parity claim is made and no screenshot files were added.

## Follow-up

Website preview/Homepage, Menu Editor, Analytics, themes, SEO filters, tracked
pages, and public/portal page rendering remain separate slices. No Odoo
frontend code is copied.
