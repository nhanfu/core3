# Website detailed QA test plan

Module: website  
QA owner: website-qa  
Developer owner: website module owner  
Reference addon/version: website, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-22

This plan follows [`website.md`](../../website.md); executed evidence is
recorded in [`../website.md`](../website.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Site/Homepage | `/website`, homepage client-action route | Published site rendering, site ordering, empty/error and public navigation |
| Page Manager | `/website/pages`, page detail/edit routes | Published/draft pages, search, route metadata, CRUD and visibility |
| YAML-driven presentation | page-owned API fragments and shared HTML components | `page.id` joins, Fluent `html.js` rendering, responsive layout and safe content binding |
| Site/Reporting/Analytics | `/website-analysis`, `api/analysis.yaml`, `website_analytics_daily` | Odoo `backend_dashboard` route/menu identity, multi-site aggregates, daily traffic, durable migration replay, read permission and empty/error states |
| Page Manager tracking/SEO filters | `/website-pages`, `api/pages.yaml`, `website_pages.track` | Odoo `Tracked`, `Not tracked`, and `Not SEO optimized` filters, durable page tracking edit, row-version guard, and responsive authenticated list |

Actors are Website Manager, Website Editor, public visitor, wrong-company user
and unauthenticated user. Fixtures use stable sites, published/draft pages,
routes and page content. Public data must contain only published records;
mutations use isolated databases and deterministic IDs.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| WEBSITE-FUNC-001 | Homepage | Published homepage loads through the declared client action and preserves site ordering | pass: focused suite |
| WEBSITE-FUNC-002 | Page Manager | Search/filter, detail, create/edit, publish/unpublish and route metadata persist after reload | pass at contract level; browser mutation planned |
| WEBSITE-FUNC-003 | Content binding | Page YAML remains presentation-only; API content is bound by `page.id` and rendered through shared components | pass: focused suite |
| WEBSITE-FUNC-004 | Public/private visibility | Draft/private pages are denied publicly while published pages resolve their intended route | pass: `website_public.integration.test.ts`; authenticated/public browser gate remains planned |
| WEBSITE-FUNC-005 | Empty/error/not-found | Empty, missing, forbidden and transport-error states are explicit and do not leak draft content | pass at contract level |
| WEBSITE-FUNC-006 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate sites/pages or moving content dates | planned restart/migration gate |
| WEBSITE-FUNC-007 | Assets/import/export | Exercise image/asset binding, page import/export and exposed preview/print actions | planned browser interaction gate |
| WEBSITE-FUNC-008 | Menu Editor CRUD | Create/edit menu labels, URL, parent, target, sequence, per-site duplicate URL guards, invalid-site rejection, stale-write protection, and persisted ordering | pass: `website_menus.integration.test.ts`; canonical site naming, restart replay, and authenticated desktop/mobile browser edit/reload pass; paired Odoo comparison remains planned |
| WEBSITE-FUNC-009 | Website Analytics | Odoo `Website > Reporting > Analytics` maps to `/website-analysis`; Website API owns totals, site lookup and daily traffic; deterministic two-site metrics and empty branch survive idempotent migration replay | pass: `website_analytics.integration.test.ts` (2 tests, 17 assertions); browser route blocked by unrelated startup error |
| WEBSITE-FUNC-010 | Page tracking and SEO filters | Odoo Page Manager filter labels map to API-owned `track` and `is_seo_optimized` predicates; tracked/untracked/not-optimized results are deterministic | pass: `website_page_tracking.integration.test.ts` |
| WEBSITE-FUNC-011 | Theme Manager catalog | Odoo `theme_install_kanban_action` maps to `/website-themes`; Theme/Category search, Author/Category grouping, installed state, and card actions are declarative and page/API-separated | pass: `website_themes.integration.test.ts` |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| WEBSITE-WF-001 | Page lifecycle | Draft → Published → Unpublished updates visibility, version and route resolution atomically | pass: `website_pages.integration.test.ts`; authenticated browser workflow remains planned |
| WEBSITE-WF-002 | Page editing | Edit content through declared API/mutation contracts and reload without client-only state | pass at contract level |
| WEBSITE-WF-003 | Site ordering | Website ordering selects the correct homepage and preserves multi-site scope | pass at contract level |
| WEBSITE-WF-004 | Asset delivery | Asset references resolve safely and broken assets produce deterministic fallback state | planned |
| WEBSITE-WF-005 | Durable/external boundary | Publishing jobs, asset processing, callbacks and cross-module integrations use Temporal when durable; retry, replay, restart and compensation are tested | planned |
| WEBSITE-WF-006 | Menu Editor | Menu changes persist through declared YAML mutation contracts and do not permit duplicate routes within a website | pass: focused integration suite, including second-site restart replay |
| WEBSITE-WF-007 | Page tracking edit | `website.write` editor toggles `track`, row version increments, stale replay returns 409, and migration replay/file-backed restart preserve the value | pass: `website_page_tracking.integration.test.ts` |
| WEBSITE-WF-008 | Theme selection lifecycle | `website.manage` Use this theme, Update theme, and Remove theme persist `theme_id`/`theme_revision`, reject stale/duplicate/not-selected actions, and recover across restart | pass: `website_themes.integration.test.ts` |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| WEBSITE-PERM-001 | Website Manager/Editor | Page/site mutations and preview actions succeed according to role | pass for Menu Editor: action endpoint rejects read-only actor and authenticated dispatcher route shows `Requires permission: website.read`; page lifecycle browser gate remains planned |
| WEBSITE-PERM-002 | Public visitor | Only published public pages and assets are visible | planned |
| WEBSITE-PERM-003 | Wrong company/site | Other-site pages, drafts and settings are not leaked or mutable | planned |
| WEBSITE-PERM-004 | Unauthenticated/expired | Private routes redirect/401/403 without draft content in the response | planned |
| WEBSITE-PERM-005 | Stale/missing/invalid | 409/404/422 leaves the current page/site unchanged | pass at contract level |
| WEBSITE-PERM-006 | Analytics reader/forbidden/transport failure | `website.read` is required; 403 and 503 contracts are explicit and do not expose metrics | pass for YAML contract; live actor proof blocked by Core3 startup |
| WEBSITE-PERM-007 | Page tracking editor boundary | `website.read` can list/filter pages but cannot mutate `track`; `website.write` is required at the action endpoint and no row changes on denial | pass: `website_page_tracking.integration.test.ts` |
| WEBSITE-PERM-008 | Theme manager actor boundary | `website.read` can discover the catalog but `website.manage` is required for theme actions; direct 403 leaves the Website row unchanged | pass: `website_themes.integration.test.ts` |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| WEBSITE-UI-001 | Homepage/public page | 1440x900, 390x844 | Navigation, content width, typography, assets and responsive layout match Odoo | planned paired capture |
| WEBSITE-UI-002 | Page Manager/edit | both | Manager list/detail/edit states, actions and permission messages match Odoo | Menu Editor row-action/form state passes Core3 desktop/mobile browser checks; paired Odoo capture remains planned |
| WEBSITE-UI-003 | Empty/draft/error states | both | Visibility and error states do not expose content or overflow | planned |
| WEBSITE-UI-004 | Current route regression | all manifest-owned Website routes | Authenticated/public desktop/mobile checks have no blank/redirect, page/request error or overflow | planned |
| WEBSITE-UI-005 | Analytics dashboard | 1440x900, 390x844 | Website selector/analytics totals and traffic chart render responsively; compare Odoo dashboard labels and empty Plausible state | blocked: Odoo Website absent in authenticated browser; Core3 startup returns HTTP 502 from unrelated CRM discovery error |
| WEBSITE-UI-006 | Page Manager tracking/SEO filters | 1440x900, 390x844 | Authenticated Core3 list exposes the Tracking/SEO filter group and stable rows without page/runtime errors; paired Odoo comparison is required when Website is available | pass for Core3 isolated runner; Odoo Website absent in authenticated session, so paired visual comparison blocked |
| WEBSITE-UI-007 | Theme Manager | 1440x900, 390x844 | Theme cards, status, search/grouping, action visibility, and responsive layout match Odoo; Odoo availability and both Core3 sizes are required | blocked: Odoo Website absent; Core3 session closed before mobile capture |

## Exit criteria

Full Website sign-off requires the focused suite, authenticated editor CRUD and
publish workflow, public/private and site-scope checks, reload/restart
persistence, Fluent HTML rendering validation, and paired Odoo desktop/mobile
comparisons. Current contract evidence is not module completion.
