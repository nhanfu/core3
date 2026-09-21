# Blog detailed QA test plan

Module: blog  
QA owner: blog-qa  
Developer owner: blog module owner  
Reference addon/version: website_blog, Odoo 19 Community  
Plan status: approved  
Last reviewed: 2026-09-12

This plan follows [`blog.md`](../../blog.md); executed evidence is recorded in
[`../blog.md`](../blog.md).

## Coverage inventory

| Menu/action family | Core3 route families | Scope |
| --- | --- | --- |
| Blogs/posts | blog and post list/detail routes | Blog CRUD, post content, publication state, author/blog links and search |
| Tags/categories | tag and category list/detail routes plus post detail x2many | Tag/category CRUD, duplicate validation, relation scope, and durable post tag assignment |
| Reporting/public views | analysis and published routes when enabled | Read-only aggregates, public published content and empty states |
| YAML-driven presentation | page/API fragments and shared HTML components | `page.id` joins, Fluent `html.js` rendering, content/assets and responsive layout |

Actors are Blog Manager, Blog Editor, public visitor, wrong-company user and
unauthenticated user. Fixtures use stable blogs, draft/published posts,
authors, tags, categories and content/assets. Public queries must exclude draft
content; mutations use isolated databases and deterministic IDs.

## Functional and data cases

| Case ID | Surface | Expected result and persistence assertion | Status |
| --- | --- | --- | --- |
| BLOG-FUNC-001 | Blogs/posts | Search/filter/detail, create/edit, author/blog links and publication fields use persisted data | pass: focused suite |
| BLOG-FUNC-002 | Tags/categories | CRUD, duplicate/blank validation, search, relation-safe deletion, and post tag assignment work | pass: focused suite; post `tag_ids` add/remove relation is persisted and exposed through the post detail grid |
| BLOG-FUNC-003 | Publication | Draft/published filtering and post state persist after reload and control visibility | pass: declared publish/unpublish action transport and persisted state/version assertions; browser visibility remains planned |
| BLOG-FUNC-004 | Analysis/public | Read-only analysis and published views use scoped real data and exclude drafts | pass: public list/detail operations use persisted SQL with Published-only filtering; authenticated-free desktop/mobile browser probes returned published list/detail 200 and draft detail 404 |
| BLOG-FUNC-005 | Empty/error/not-found | Empty, missing, forbidden and transport-error states are explicit | pass at contract level |
| BLOG-FUNC-006 | Migrations/seeds | Reapply schema/demo fixtures idempotently without duplicate blogs, posts or tags | planned restart/migration gate |
| BLOG-FUNC-007 | Assets/import/export/print | Exercise images/assets, editor content, import/export and exposed print/preview actions | pass: authenticated multipart post-attachment upload/download, persisted `content_html`, public sanitized content rendering, validated idempotent import, shared list export affordance, and declared detail print action |

## Workflow and integration cases

| Case ID | Workflow/integration | Expected result | Status |
| --- | --- | --- | --- |
| BLOG-WF-001 | Post lifecycle | Draft → Published → Unpublished updates route visibility, version and indexes atomically | pass: workflow API publishes/unpublishes persisted draft, increments versions 1 → 2 → 3, records publication date, and rejects duplicate publish; public/browser visibility remains planned |
| BLOG-WF-002 | Taxonomy | Tags/categories attach and detach without leaking or deleting referenced posts | pass: `blog_post_tags` add/remove uses parent and relation row concurrency, updates denormalized names, and survives restart |
| BLOG-WF-003 | Content rendering | Stored content and assets render through declared YAML/shared HTML components without unsafe interpolation | pass for persisted attachment storage/download contract; rendered content and public asset policy remain planned |
| BLOG-WF-004 | Website integration | Published posts resolve through Website routes and preserve site/company scope | planned integration gate |
| BLOG-WF-005 | Durable/external boundary | Publishing, asset processing, notifications and third-party callbacks use Temporal when durable; retry, replay, restart and compensation are tested | planned |

## Permission and security cases

| Case ID | Actor/scope | Expected result | Status |
| --- | --- | --- | --- |
| BLOG-PERM-001 | Blog Manager/Editor | Blog, post and taxonomy mutations succeed according to role | planned browser actor gate |
| BLOG-PERM-002 | Public visitor | Only published public posts/assets are visible | pass: public list/search/detail operations expose published post and 404 draft detail; desktop/mobile browser captures completed; asset boundary remains planned |
| BLOG-PERM-003 | Wrong company/site | Other-site blogs, drafts and assets are not leaked or mutable | planned |
| BLOG-PERM-004 | Unauthenticated/expired | Private routes redirect/401/403 without draft content | planned |
| BLOG-PERM-005 | Stale/missing/invalid | 409/404/422 leaves current blog/post/taxonomy unchanged | pass at contract level, including post tag duplicate, invalid, parent-stale, and line-stale guards |

## Visual, responsive, and regression cases

| Case ID | State | Viewport | Required assertion | Status |
| --- | --- | --- | --- | --- |
| BLOG-UI-001 | Blog/post manager | 1440x900, 390x844 | Menu order, list/form fields, editor controls and responsive layout match Odoo | planned paired capture |
| BLOG-UI-002 | Published/public post | both | Typography, images, tags, navigation and draft/public visibility match Odoo | planned paired capture |
| BLOG-UI-003 | Tags/categories/analysis | both | Configuration forms, reports and empty states match Odoo | planned |
| BLOG-UI-004 | Current route regression | all manifest-owned Blog routes | Authenticated/public desktop/mobile checks have no blank/redirect, page/request error or overflow | planned |

## Exit criteria

Full Blog sign-off requires the focused suite, authenticated editor CRUD and
publication workflow, public/private and site-scope checks, reload/restart
persistence, Fluent HTML/assets validation, and paired Odoo desktop/mobile
comparisons. Current contract evidence is not module completion.

## BLOG-POST-ARCHIVE-001 — 2026-09-21

| Case ID | Class | Setup / actor | Action and expected result | Status |
| --- | --- | --- | --- | --- |
| BLOG-ARCHIVE-FUNC-001 | functional/data | Blog Editor with `blog.read`, `blog.write`, `blog.manage`; published demo post | Archive persists `active = false`, changes state to Archived, clears `published_date`, increments row version, and excludes the post from published reads | pass: focused 3-test slice |
| BLOG-ARCHIVE-WF-001 | workflow | Same actor; archived post | Unarchive persists `active = true`, returns the post to Draft, does not republish it, and increments row version | pass: focused 3-test slice |
| BLOG-ARCHIVE-PERM-001 | permission/security | Read/write actor without `blog.manage` | Archive is rejected with 403 and the row remains unchanged | pass: focused 3-test slice |
| BLOG-ARCHIVE-UI-001 | responsive/visual | Authenticated shared Odoo profile; 1440x900 target and 390x844 target | Odoo Blog Post Pages and archived filter should be compared against Core3; exact blockers are recorded because reference `/blog` is 404 and Core3 `:3001` is unavailable | blocked: no visual claim |
