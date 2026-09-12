# Website detailed QA test plan

Module: website  
QA owner: website-qa  
Developer owner: website module owner  
Reference addon/version: website, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`website.md`](../../website.md); executed evidence is
recorded in [`../website.md`](../website.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Site/Homepage | `/website`, homepage client-action route | Published site rendering, site ordering, empty/error and public navigation |
| Page Manager | `/website/pages`, page detail/edit routes | Published/draft pages, search, route metadata, CRUD and visibility |
| YAML-driven presentation | page-owned API fragments and shared HTML components | `page.id` joins, Fluent `html.js` rendering, responsive layout and safe content binding |

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

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| WEBSITE-WF-001 | Page lifecycle | Draft → Published → Unpublished updates visibility, version and route resolution atomically | pass: `website_pages.integration.test.ts`; authenticated browser workflow remains planned |
| WEBSITE-WF-002 | Page editing | Edit content through declared API/mutation contracts and reload without client-only state | pass at contract level |
| WEBSITE-WF-003 | Site ordering | Website ordering selects the correct homepage and preserves multi-site scope | pass at contract level |
| WEBSITE-WF-004 | Asset delivery | Asset references resolve safely and broken assets produce deterministic fallback state | planned |
| WEBSITE-WF-005 | Durable/external boundary | Publishing jobs, asset processing, callbacks and cross-module integrations use Temporal when durable; retry, replay, restart and compensation are tested | planned |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| WEBSITE-PERM-001 | Website Manager/Editor | Page/site mutations and preview actions succeed according to role | planned browser actor gate |
| WEBSITE-PERM-002 | Public visitor | Only published public pages and assets are visible | planned |
| WEBSITE-PERM-003 | Wrong company/site | Other-site pages, drafts and settings are not leaked or mutable | planned |
| WEBSITE-PERM-004 | Unauthenticated/expired | Private routes redirect/401/403 without draft content in the response | planned |
| WEBSITE-PERM-005 | Stale/missing/invalid | 409/404/422 leaves the current page/site unchanged | pass at contract level |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| WEBSITE-UI-001 | Homepage/public page | 1440x900, 390x844 | Navigation, content width, typography, assets and responsive layout match Odoo | planned paired capture |
| WEBSITE-UI-002 | Page Manager/edit | both | Manager list/detail/edit states, actions and permission messages match Odoo | planned paired capture |
| WEBSITE-UI-003 | Empty/draft/error states | both | Visibility and error states do not expose content or overflow | planned |
| WEBSITE-UI-004 | Current route regression | all manifest-owned Website routes | Authenticated/public desktop/mobile checks have no blank/redirect, page/request error or overflow | planned |

## Exit criteria

Full Website sign-off requires the focused suite, authenticated editor CRUD and
publish workflow, public/private and site-scope checks, reload/restart
persistence, Fluent HTML rendering validation, and paired Odoo desktop/mobile
comparisons. Current contract evidence is not module completion.
