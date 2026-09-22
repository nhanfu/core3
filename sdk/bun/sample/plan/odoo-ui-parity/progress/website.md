# website parity progress

Module owner: website module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: active
Verification trigger: feature-complete
Candidate commit: `760f171f` (DEV-2 Menu Editor row-action parity); prior public-renderer/runtime fixes remain in history

## Current state

The Website page lifecycle now has focused integration evidence: a seeded Draft
page publishes and unpublishes through the declared YAML workflow, increments
row versions, rejects duplicate transitions, and enforces the manager-only
unpublish permission. This is a bounded slice only; no full parity claim is
made here. Page metadata now also has a guarded YAML edit action that persists
title, URL, site, and presentation flags with row-version concurrency checks.
The public boundary now resolves published pages by path and ID and excludes
draft pages through Website-owned operations. The public browser route and
Fluent HTML renderer are now declared and covered by an implementation
contract test. A live single-module browser smoke verified the published Home
at 1440x900 and 390x844, and verified that the draft Contact us page is not
exposed. Page content is now migration-backed and sanitized before public DOM
insertion; a live browser smoke rendered the seeded content with no scripts.
The public operations now accept an explicit site scope and deterministic
second-site fixtures prove duplicate paths do not cross site boundaries.
Published pages now expose only public asset metadata and a binary asset route;
the seeded SVG loaded successfully in a 390x844 headless browser check.
Multipart Website asset upload/download now persists storage metadata through
the YAML API and keeps uploaded assets private by default.
The Menu Editor now has a declared update action: menu rows open the permissioned
server form, create and update validate the target website, derive the canonical
site name from the selected website ID, duplicate URLs are rejected within that
website, and row versions protect edits from stale writes. The focused Menu Editor
suite proves create/edit persistence, sequence and target flags, invalid-site
atomicity, case-insensitive duplicate-route rejection, a read-only actor 403 at
the action endpoint, and second-site persistence after file-backed restart and
migration replay.
These are Core3 runtime checks, not paired Odoo visual sign-off.

## 2026-09-22 owner checkpoint — Theme Preview and asset effects

Implemented `WEBSITE-THEME-PREVIEW-001`, the next uncovered Website slice after
tracking/SEO filters and Theme Manager catalog/actions. The Odoo
`theme_view_form_preview` read-only iframe form is represented by a separate
permissioned Core3 preview page/API contract, with a Theme Manager row action
and safe public preview opener. Theme selection now has durable visual tokens
and the public Website renderer applies validated colors for installed or
previewed themes. Migration replay, file-backed restart, site scope, and the
existing Theme Manager/public regressions pass.

Focused result: 11 tests / 77 assertions across Theme Manager, Theme Preview,
and public Website visibility. Evidence is under
`odoo-ui-parity/evidence/website/2026-09-22/website-theme-preview-001/`.

Odoo browser comparison is blocked because browser instance `245ea108` did not
provide a confirmed borrow of the existing Odoo tab and the available
authenticated tab was CRM without the Website application. No screenshots are
claimed. Page publish/unpublish browser workflow, import/export, richer asset
installation effects, and paired Odoo desktop/mobile comparison remain open.

## 2026-09-22 owner checkpoint — Theme Manager

Implemented the next absent Website source-backed slice from Odoo 19's
`theme_install_kanban_action`: durable catalog/website theme selection,
`Use this theme`, `Update theme`, and `Remove theme` actions, page/API YAML
separation, Website detail route binding, permissions, guards, and restart
coverage. Candidate files are covered by `website_themes.integration.test.ts`
(6 tests, 35 assertions).

Odoo desktop/mobile evidence is captured, but both views show the authenticated
actor in Discuss without a Website application. The Core3 desktop attempt was
only a blank shell, and the browser session was closed before the mobile
capture. This is a conditional bounded slice, not module sign-off.

## Next bounded task

Implement Theme preview/form behavior and theme asset effects, then return to
the page publish/unpublish browser workflow, import/export, and public/portal
rendering. Do not claim paired Odoo visual parity until a Website-enabled
authenticated actor is available and both Core3 viewports are captured.

## Next bounded task

Complete authenticated browser permission/site-scope checks for the page
publish/unpublish lifecycle, then continue with assets/import/export, richer
rendered page content, and paired Odoo comparison before module sign-off. Menu
Editor service and browser actor/site-scope behavior plus file-backed
restart/migration replay are verified; page lifecycle browser interaction,
process restart, and Odoo comparison remain open.

## Runtime evidence

| Date | Check | Evidence | Result |
| --- | --- | --- | --- |
| 2026-09-13 | Public Website page/content | Single-module server on `:4310`; published Home/content rendered in headless Chrome; draft `/contactus` showed unavailable state; no page errors/scripts in rendered content | Core3 runtime pass; artifact `/tmp/core3-odoo-parity/website-public-content-desktop.png`; paired Odoo comparison pending |
| 2026-09-13 | Authenticated Page Manager edit | Admin browser session exposed row Edit, saved title/URL/content, and reloaded the list with the changed row; no page errors | Core3 runtime pass; durable restart and paired Odoo comparison pending |
| 2026-09-13 | File-backed restart and migration replay | Explicit DuckDB file retained edited published content/state/version across close/reopen and rerunning Website migrations | Core3 persistence pass; full process/permission matrix and paired Odoo comparison pending |
| 2026-09-13 | Public multi-site scope | Two deterministic published sites share `/`; explicit `website_id` resolves the requested site and cross-site ID lookup returns 404 | Core3 public scope pass; company/actor permission and paired Odoo comparison pending |
| 2026-09-13 | Published asset delivery | Seeded SVG is exposed only through a published page, returns `image/svg+xml`, loads at natural width 240 in mobile Chrome, and has no page errors | Core3 asset delivery pass; upload/editor asset workflow and paired Odoo comparison pending |
| 2026-09-13 | Asset upload/download | Multipart upload persisted a private page asset and its storage key; authenticated download returned the exact four-byte fixture; temporary upload files were removed after the test | Core3 API pass; browser attachment interaction, public promotion, and paired Odoo comparison pending |
| 2026-09-13 | Menu Editor service lifecycle | `website_menus.integration.test.ts`; declared create/update actions created and edited a menu item, persisted sequence/parent/target flags, rejected stale and case-insensitive duplicate routes, and left the original row unchanged on invalid-site update | Core3 service pass; authenticated browser interaction, restart replay, and paired Odoo comparison pending |
| 2026-09-13 | Menu Editor actor/site scope and restart | `bun test ./test/website_menus.integration.test.ts --timeout 20000`; read-only actor received action-endpoint 403 with no insert; site name was canonicalized from `website_id`; second-site menu retained scope/name/sequence/version across close/reopen and migration replay | Core3 service/API and persistence pass; authenticated browser interaction and paired Odoo comparison pending |
| 2026-09-13 | Menu Editor row-action/browser boundary | Single-module server on `:4316`; Odoo `website_pages_tree_view` uses a row object action. Core3 now declares the permissioned `edit_website_menu` action on the Menu column, so desktop/mobile authenticated admin rows expose `More actions` → `Edit`; second-site edit retained its canonical Website selection, Save and reload preserved the changed label/URL, and dispatcher was denied with `Requires permission: website.read` | Core3 browser interaction, permission, and site-scope pass; next incomplete functionality is authenticated page publish/unpublish workflow plus paired Odoo desktop/mobile comparison |
## Review integration

- Integrated candidate: `760f171f`.
- Bounded Menu Editor row-action, authenticated desktop/mobile persistence,
  second-site scope, dispatcher 403, focused tests, build, audit, and
  diff-check evidence were reviewed.
- Paired authenticated Odoo visual comparison and broader Website gates remain
  open; this is not module sign-off.

## 2026-09-21 owner checkpoint — Website Analytics

- Bounded source-backed Analytics slice implemented in `services/website`:
  Odoo `website-analytics` route/menu identity, page/API separation, durable
  daily telemetry table, deterministic two-site fixtures, read permission and
  error contracts, and focused persistence/discovery tests.
- Focused result: `bun test ./test/website_analytics.integration.test.ts
  --timeout 20000` — 2 tests, 17 assertions passed; `git diff --check` passed.
- Browser evidence attempted with the authenticated shared browser on instance
  `245ea108`. Odoo has no Website app in the exposed session and direct
  Analytics navigation returns Discuss. Core3 startup is blocked by unrelated
  CRM YAML discovery errors, yielding HTTP 502. Desktop/mobile diagnostic
  captures are recorded in the evidence folder; no visual parity claim.
- Module status remains active/conditional. Open work includes Odoo Website
  availability, Core3 startup repair outside Website scope, paired comparison,
  and the previously listed Website follow-ups.

## 2026-09-22 owner checkpoint — Website Settings Identification

Implemented stable ID `WEBSITE-SETTINGS-IDENTIFICATION-001`, the next missing
concrete Odoo Website action after the completed theme/page-manager slices.
Odoo `action_website_configuration` → `menu_website_website_settings` is mapped
to `/website-settings` with a Website Configuration > Settings entry and a
Website detail Settings action. The bounded SettingsView covers the Odoo
Website Identification surface's durable Name and Domain controls; favicon
binary upload remains a separate follow-up.

The page contract is `services/website/pages/settings.yaml`, the API/action
contract is `services/website/api/settings.yaml`, and both join by
`page.id: website-settings`. Updates reuse `website_websites` with
`website.manage`, required `row_version`, invalid-name/domain guards, and
file-backed DuckDB restart/migration replay coverage. The shared SettingsView
primitive now renders styled text settings fields, which was required because
the existing component otherwise treated text settings as checkboxes.

Focused result: `test/website_settings.integration.test.ts` — 4 tests / 21
assertions pass. Evidence is under
`odoo-ui-parity/evidence/website/2026-09-22/website-settings-identification-001/`.

BrowserSkill instance `245ea108` was healthy, but borrowing the required
authenticated Odoo tab `1770662590` returned `tab is borrowed by another
session` with owner `wabp`. The tab was not taken over or stopped; no Odoo or
Core3 desktop/mobile captures were made and no visual-parity claim is made.

## 2026-09-22 owner checkpoint — Website Settings favicon

Implemented stable ID `WEBSITE-SETTINGS-FAVICON-001`, the next genuinely
missing Website setting after the completed import/export, name/domain,
theme, analytics, tracking/SEO, content, asset, and public slices. Odoo's
Website Identification form exposes a binary `favicon` image field; Core3 now
has a declarative SettingsView image control, a `website.manage` upload action,
durable favicon metadata/bytes, stale/version guards, authenticated download,
and migration/restart persistence.

Focused result: `test/website_favicon_settings.integration.test.ts` — 4 tests,
20 assertions; existing Website Settings regression — 4 tests, 21 assertions.
Evidence is under
`odoo-ui-parity/evidence/website/2026-09-22/website-settings-favicon-001/`.

BrowserSkill instance `245ea108` was healthy, but authenticated Odoo tab
`1770662590` was already borrowed by session `xigt`; the tab was not taken over
or stopped. No truthful Odoo favicon desktop/mobile captures were available and
no visual-parity claim is made. Website module sign-off and broader open slices
remain pending.
