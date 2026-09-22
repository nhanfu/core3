# Blog parity — configuration slices

## Source-backed trace

The local Odoo 19 `website_blog` addon is the source for this slice. In
`views/website_blog_views.xml`, `menu_website_blog_root_global` is the Blog
submenu under `website.menu_website_global_configuration` (Website →
Configuration), ordered at 100. Its children are ordered Blogs (20), Tags
(30), and Tag Categories (40), bound respectively to `action_blog_blog`,
`action_tags`, and `action_tag_category`. The actions are list/form windows
for `blog.blog`, `blog.tag`, and `blog.tag.category`.

This batch implements the missing Tag Categories list/form vertical slice and
aligns the Core3 Blog configuration menu ordering. It uses Core3 YAML contracts
and deterministic DuckDB/Postgres fixtures; no Odoo frontend code is copied.

## Core3 contract

- Presentation: `services/blog/pages/tag-categories.yaml` (`page.id:
  blog-tag-categories`) contains only layout, labels, and the Odoo-style list.
- Backend: `services/blog/api/tag-categories.yaml` joins by `page.id` and owns
  datasource SQL, actions, permissions, validation, concurrency, and error states.
- Fixture: migration `20260912100000-003-blog-tag-categories.yaml` seeds
  Technology and Architecture and is idempotent.
- Permissions: viewing requires `blog.read`; create/edit requires `blog.write`.
- Empty/error states are represented by the query's zero-row result and the
  unauthorized, forbidden, and transport error contracts.

## Acceptance and evidence

- Menu order is Blogs, Tags, Tag Categories under Configuration.
- Tag Categories shows the Odoo list field Name, supports search, and opens the
  YAML form action; blank and duplicate names are rejected.
- `blog_tag_categories` discovery, route joining, permissions, fixtures, and
  error contracts pass `blog_tag_categories.integration.test.ts`.
- Authenticated Odoo/Core3 desktop (1440x900) and mobile (390x844) comparisons
  must be captured under `/tmp/core3-odoo-parity/blog/`. If either runtime is
  unavailable, record the exact blocker and make no visual-parity claim.

## Verification record — 2026-09-12

- Focused contract test: `bun test ./test/blog_tag_categories.integration.test.ts`
  passed, 2 tests / 13 assertions.
- Shared UI audit: `bun run audit` passed (625 pages, 634 routes, 1070
  datasources).
- `git diff --check` passed.
- Browser comparison is blocked. The interactive Playwright session is not
  available in this Codex environment and Playwright is not installed in the
  worktree. A Core3 dev attempt also failed before binding port 3001 because
  an unrelated existing catalog error aborts startup:
  `Named action sms_marketing.mailings.cancel permission does not match its
  workflow transition` (`packages/server/src/routes/yaml-api.ts:253`). Vite
  alone reached localhost:3002. Odoo is running at localhost:8073, but without
  an available authenticated comparison browser and a healthy Core3 API, no
  visual-parity claim is made and no captures were created.

The existing Blog Posts and Blog Analysis entries remain Core3 extensions in
the Content and Reporting groups; they are outside this bounded Odoo menu slice.

## Blogs action slice — 2026-09-12

The next source action is `action_blog_blog` (Blogs), ordered before Tags and
Tag Categories under Website → Configuration → Blog. Odoo 19 defines a
`blog.blog` list ordered by sequence with the drag handle, name, post count,
website (only for multi-website groups), and an invisible active field. Its
form visibly exposes Blog Name and Blog Subtitle, while the search view searches Name
and provides an Archived filter. Core3 implements the visible single-website
list fields and a list-to-form YAML action; archive filtering remains
deferred because the bounded source action has no visible filter control in
the current Core3 ListView contract. The shared responsive ListView owns the
390px layout; no Blog-specific frontend code is introduced.

- Presentation: `services/blog/pages/blogs.yaml` contains the page and list
  only (`page.id: blog`).
- Backend: `services/blog/api/blogs.yaml` joins by `page.id` and owns list and
  detail datasources, permissions, validation, concurrency, and error states.
- Existing deterministic `blog-demo-001` data supplies the visible blog and
  its two posts; no new fixture is needed for this action slice.
- Focused contract test: `bun test ./test/blog_blogs.integration.test.ts`.
- Verification: focused Blogs contract test passed (2 tests / 10 assertions),
  `bun run audit` passed (641 pages, 657 routes, 1102 datasources), repository
  lint passed, and `git diff --check` passed.
- Browser comparison is blocked for this batch. Odoo responds at
  `127.0.0.1:8073/web/login` (200), while Core3 responds at
  `127.0.0.1:3001/api/modules` with 401 as expected for an unauthenticated
  request. This worktree has `/usr/bin/google-chrome` but no Playwright package
  and no interactive Playwright session, so authenticated 1440x900 and
  390x844 captures could not be attempted to completion. No visual-parity
  claim is made; the runtime probe is recorded at
  `/tmp/core3-odoo-parity/blog/runtime-attempt-20260912.txt`.

## Post tag_ids workflow slice — 2026-09-20

The next source-backed gap is Odoo's `blog.post.tag_ids` Many2many workflow.
`models/website_blog.py` declares `BlogPost.tag_ids` and `BlogTag.post_ids`,
and the Odoo tag form exposes `post_ids`; the existing Core3 Blog implementation
only kept a free-text `blog_posts.tags` value. This bounded slice adds the
durable `blog_post_tags` relation and exposes add/remove controls on the post
detail form.

- Presentation: `services/blog/pages/post-detail.yaml` is layout-only and
  renders the relation through an Odoo-style `LineItemGrid`.
- Backend: `services/blog/api/post-detail.yaml` owns the relation datasource,
  tag lookup, scoped add/remove mutations, permissions, parent/line
  optimistic-concurrency guards, and refresh contracts.
- Fixture: migration `20260920120000-008-blog-post-tags.yaml` creates the
  idempotent relation and seeds deterministic mappings for the demo posts.
- Compatibility: post lists, public operations, and tag post counts read the
  normalized relation and fall back to legacy free-text tags for imported rows.

Verification for this slice: `bun test ./test/blog*.integration.test.ts
--timeout 20000` passed 25 tests / 142 assertions; `bun run audit` passed with
665 pages, 674 routes, and 1,182 datasources; targeted Blog ESLint and
`git diff --check` passed. Authenticated paired Odoo desktop/mobile comparison
remains open; no visual-parity claim is made for this backend/relation slice.

## Post archive/unarchive slice — 2026-09-21

The next uncovered source-backed `blog.post` behavior is Odoo's durable
`active` archive flag. `views/website_pages_views.xml` exposes the Blog Post
Pages action with an Archived search filter, while `models/website_blog.py`
sets `is_published` false when a post is archived. The existing Core3 workflow
had an `Archived` label but no persisted active flag, no unarchive transition,
and public reads did not guard archived rows.

Stable ID: `BLOG-POST-ARCHIVE-001`.

- Schema: `services/blog/migrations/20260921100000-009-blog-post-archive.yaml`
  adds and backfills `blog_posts.active` and its index idempotently.
- Presentation: `services/blog/pages/posts.yaml` stays layout-only and adds the
  Odoo-style Active/Archived record filter, active-only default, hidden active
  status column, and Archive/Unarchive row actions.
- Backend: `services/blog/pages/blog-workflow.yaml` owns the permissioned
  archive/unarchive transitions; archive clears `published_date`, sets
  `active = false`, and unarchive returns the post to Draft without republishing.
  `services/blog/operations.yaml` excludes inactive posts from public list and
  detail routes.
- Permissions: reads remain `blog.read`; archive and unarchive require
  `blog.manage`.
- Test: `test/blog_post_archive.integration.test.ts` verifies persistence,
  published-post unpublication, default active filtering, archived filtering,
  and the manage permission boundary.

The authenticated reference database does not have `website_blog` installed:
the launcher has no Website/Blog menu and `/blog` returns Odoo Error 404. Core3
also had no backend listener on `localhost:3001` during the browser probe. The
desktop/mobile captures therefore document the exact reference blocker only;
they are not visual-parity evidence.

Verification: isolated focused test passed 3 tests / 13 assertions; Blog Sass
build and Blog-scoped diff-check passed. The full Blog wildcard run was blocked
by the concurrent unrelated duplicate datasource `sale_quotation_templates` in
`services/order`; `bun run audit` stops on the same duplicate before producing
an audit count. No full Blog sign-off is made.

## Blog archive/unarchive slice — 2026-09-22

The next genuinely uncovered bounded source behavior is Odoo's durable
`blog.blog.active` archive flag and its child-post cascade. In
`addons/website_blog/models/website_blog.py`, `BlogBlog.active` defaults true and
`BlogBlog.write()` writes the same active value to every related `blog.post`.
In `addons/website_blog/views/website_blog_views.xml`, the Blogs list includes
an invisible active field and the search view exposes the Archived filter.

Stable ID: `BLOG-BLOG-ARCHIVE-001`.

### Gap matrix

| Odoo behavior | Existing Core3 gap | Bounded change | Verification |
| --- | --- | --- | --- |
| Blogs default to active records with an Archived filter | `blog_blogs` returned both active states and the page had no filter | `pages/blogs.yaml` declares the active-only default, Records filter, and hidden active status column; `api/blogs.yaml` applies the real `active` query parameter | page/API contract test and persisted filter query |
| Archive/unarchive a blog | `blog_blogs.active` existed in the baseline schema but had no action or workflow | `api/blogs.yaml` adds permissioned archive/unarchive actions; `pages/blog-blog-workflow.yaml` adds row-version and company guards | workflow, permission, stale, and atomicity assertions |
| `BlogBlog.write()` cascades to posts | archiving a blog did not affect child posts | archive sets child posts inactive/Archived/unpublished; unarchive restores active Draft without republishing | child rows and versions after both transitions |
| Public website excludes archived blogs | public SQL only guarded the post row | `operations.yaml` joins the active parent blog for public list/detail reads | contract inspection plus cascade/public-state assertions |

### Core3 contract

- Presentation remains layout-only in `services/blog/pages/blogs.yaml` and
  joins `services/blog/api/blogs.yaml` by matching `page.id: blog`.
- The API owns the real active-state datasource, actions, permissions, and
  refresh targets. Workflow persistence is isolated in the Blog-owned
  `pages/blog-blog-workflow.yaml` contract.
- The existing baseline `blog_blogs.active` column is reused; no migration is
  required for this slice. Child post active/state changes are transactional
  workflow steps with row-version guards.
- Archive/unarchive requires `blog.manage`, while list/detail reads remain
  `blog.read`. A stale parent or wrong-company transition returns 409 without
  changing the parent or its posts.

### Verification — 2026-09-22

- Focused test: `bun test ./test/blog_blog_archive.integration.test.ts
  --timeout 20000` passed, 4 tests / 25 assertions.
- The test covers `page.id` joining, active filtering, archive and unarchive
  state guards, permission enforcement, child-post cascade, no automatic
  republish, and file-backed restart persistence.
- Authenticated Odoo blocker captures are under
  `evidence/blog/2026-09-22/BLOG-BLOG-ARCHIVE-001/` and
  `/tmp/core3-odoo-parity/blog/2026-09-22/`. The reference database has no
  Website/Blog installation: the launcher has no Website or Blog item and
  `/blog` returns Error 404. Core3 `localhost:3001` refused the browser
  navigation, so no paired visual-parity claim is made.
- Full Blog wildcard: `bun test ./test/blog*.integration.test.ts
  --timeout 20000` passed, 32 tests / 181 assertions. Shared UI audit passed
  with 784 pages, 793 routes, and 1,614 datasources. Blog Sass, targeted Blog
  ESLint, and Blog-scoped `git diff --check` are the final commit gates.

## Blog Post Pages Kanban slice — 2026-09-22

The next genuinely uncovered bounded source behavior is Odoo's Blog Post Pages
kanban view. In `addons/website_blog/views/website_pages_views.xml`,
`action_blog_post` exposes `list,kanban,form`, and
`blog_post_view_kanban` renders the post title, blog, post date, author, and
Published/Not Published state. Core3 previously exposed only the list view and
kept its post datasource/actions inside the page contract.

Stable ID: `BLOG-POST-KANBAN-001`.

### Gap matrix

| Odoo behavior | Existing Core3 gap | Bounded change | Verification |
| --- | --- | --- | --- |
| Blog Post Pages offers list, kanban, and form modes | Core3 Posts had only a list and no visible view-mode tabs | `pages/posts.yaml` declares List/Kanban tabs and the Odoo-backed kanban card | page contract and Odoo source assertions |
| Kanban cards show title, blog, post date, author, and publication state | No card projection existed | `api/posts.yaml` adds durable `post_date`, `is_published`, and `publication_status` projections | real datasource query assertions |
| Page/API contracts remain separate | Posts datasource/actions were page-owned | new `api/posts.yaml` owns datasource/actions and joins `page.id: blog-posts`; page YAML is layout-only | discovery and regression tests |

### Core3 contract

- Presentation is layout-only in `services/blog/pages/posts.yaml`, with
  visible List and Kanban tabs using the shared responsive ListView.
- Backend is `services/blog/api/posts.yaml`, joined by matching
  `page.id`; it owns the post datasource, error states, permissions,
  import/create actions, and existing workflow action references.
- No migration is required. Card date/publication labels are derived from
  existing durable `published_date`, `created_at`, and `state` columns.

### Verification — 2026-09-22

- Focused test passed 3 tests / 18 assertions.
- Full Blog wildcard passed 35 tests / 199 assertions.
- Evidence is under
  `evidence/blog/2026-09-22/BLOG-POST-KANBAN-001/`.
- The authenticated reference has no Website/Blog installation and
  `/blog` returns Odoo Error 404 at desktop and 390x844 mobile sizes.
  Core3 `localhost:3001` returned `net::ERR_CONNECTION_REFUSED`; no paired
  visual-parity claim is made.

## Blog Tag reverse post relation slice — 2026-09-22

The next genuinely uncovered bounded source behavior is the Odoo Blog Tag
form's reverse `post_ids` relation. `addons/website_blog/views/website_blog_views.xml`
defines the tag form with Name, Category, Color, and a `post_ids` field labeled
`Used in: `; the local model declares `BlogTag.post_ids` as a Many2many to
`blog.post`. Core3 already persists the normalized `blog_post_tags` relation
and exposes its forward controls on the post form, but the Tags form had no
reverse relation panel or mutation path.

Stable ID: `BLOG-TAG-POSTS-001`.

### Gap matrix

| Odoo behavior | Existing Core3 gap | Bounded change | Verification |
| --- | --- | --- | --- |
| Tag form shows Name, Category, Color, and Used in posts | Tags list opened only a flat three-field form | Add a YAML tag detail form with a Used in LineItemGrid and List/Form navigation | page/API and local Odoo source assertions |
| `post_ids` relation is readable and editable | Only the post-side relation controls existed | Add reverse relation datasource, post lookup, guarded add/remove actions, and refresh targets | relation persistence, duplicate/invalid/stale guards |
| Relation edits remain durable | No tag-side restart test existed | Reuse `blog_post_tags`, synchronize legacy `blog_posts.tags`, and increment parent/line versions transactionally | file-backed close/reopen and migration replay |

### Core3 contract

- `services/blog/pages/tags.yaml` remains presentation-only and declares
  visible List/Form tabs plus the `blog-tag-detail` side-panel form.
- `services/blog/pages/tag-detail.yaml` is layout-only and renders the Odoo
  Tag form fields and `Used in` relation through `LineItemGrid`.
- `services/blog/api/tag-detail.yaml` joins by `page.id: blog-tag-detail` and
  owns the tag detail/relation datasources, lookup, permissions, and guarded
  add/remove mutations. The existing `api/tags.yaml` remains the list/create
  contract and keeps the matching `page.id: blog-tags`.
- No migration is required. The existing `blog_post_tags` table is the durable
  source of truth; add/remove operations also update the compatibility
  `blog_posts.tags` projection and use parent/line optimistic-concurrency
  guards.
- Reading the form and relation requires `blog.read`; editing tag fields and
  adding/removing posts requires `blog.write`. Invalid, duplicate, missing,
  wrong-company, and stale relation operations return explicit errors without
  partial writes.

### Acceptance checklist

- Tags action retains Odoo List/Form modes and opens a detail form with Name,
  Category, Color, and `Used in` posts.
- A reader can query the tag and reverse relation but cannot mutate it; a
  writer can add/remove a post, and duplicate, invalid, stale, and
  cross-company writes are rejected atomically.
- Relation state and synchronized post tag names survive file-backed restart
  and idempotent migration replay.
- Authenticated Odoo/Core3 desktop (1440x900) and mobile (390x844) checks are
  captured under the feature evidence folder. The current reference has no
  installed Website/Blog module and Core3 runtime availability is recorded
  exactly; no visual-parity claim is made when either side is unavailable.

## Blog Post website action slice — 2026-09-22

The next uncovered concrete action in Odoo's Blog Post Pages source is the
website redirect action. `addons/website_blog/views/website_pages_views.xml`
sets both the Blog Post list and kanban views to `type="object"
action="open_website_url"`; the Blog Post form also exposes the same website
redirect button through the `is_published` website widget. Core3 previously
opened only the private post detail route and did not project a public website
URL or expose the action.

Stable ID: `BLOG-POST-WEBSITE-001`.

### Gap matrix

| Odoo behavior | Existing Core3 gap | Bounded change | Verification |
| --- | --- | --- | --- |
| Blog Post list/kanban records open `open_website_url` | Posts opened only the private `/blog-post-detail` route and had no URL projection | Project a durable row URL and add a shared read-only `Open website` client action | source-backed contract test and authenticated browser action when runtime is available |
| Blog Post form exposes a website redirect affordance | Detail form had Back, Edit, and Print only | Add the same action to the YAML form header and use the existing public renderer route | detail contract and public published/draft guard assertions |
| Public website action respects publication state | The action had no declared route contract | Use the existing `/blog/post?id=...` Core3 alias; public operations continue to require active Published rows | public SQL assertions and browser blocker captures |

### Core3 contract

- Presentation remains layout-only in `services/blog/pages/posts.yaml` and
  `services/blog/pages/post-detail.yaml`.
- `services/blog/api/posts.yaml` and `services/blog/api/post-detail.yaml`
  remain the matching backend contracts and project `website_url` from the
  durable post ID. The action requires `blog.read` and performs no mutation.
- The Odoo slug path is represented by the existing Core3 public route alias
  `/blog/post?id=<post-id>`; this deliberate route difference is documented
  here rather than hiding it in page code.
- Draft and archived posts can expose a manager URL, but the public route
  continues to return the existing unavailable/404 behavior because
  `operations.yaml` requires both `active = TRUE` and `state = 'Published'`.

### Acceptance checklist

- Posts list, kanban, and detail contracts expose the `Open website` action
  with `blog.read` permission and no mutation fields.
- Published and draft/archived post URL projections are durable and resolve to
  the Core3 public route; public SQL never exposes inactive or unpublished
  rows.
- Focused integration coverage asserts page/API separation, Odoo source
  action mapping, URL projection, permission, read-only behavior, and public
  visibility guards.
- BrowserSkill desktop/mobile captures are retained under
  `evidence/blog/2026-09-22/BLOG-POST-WEBSITE-001/`. The shared authenticated
  tab was already borrowed by another team session, and the same-instance
  task tab showed Odoo `/blog` Error 404, so no visual-parity claim is made.

## Blog Post New action slice — 2026-09-22

The next uncovered concrete Odoo Website Blog action is
`website_blog.blog_post_action_add` (`BLOG-POST-NEW-001`). Odoo defines this
as a modal `New Blog Post` form with only `Select Blog` and `Blog Post Title`;
the selected active blog supplies the durable blog and company context for the
new draft. Core3 previously exposed a full editor-shaped create form that
accepted caller-supplied `blog_name` and `company_name`, so it did not match
the source action or protect those derived fields.

### Gap matrix

| Odoo behavior | Existing Core3 gap | Bounded change | Verification |
| --- | --- | --- | --- |
| New Blog Post opens a form with Select Blog and Blog Post Title | Create exposed unrelated editor fields and trusted caller-supplied scope fields | Keep the existing stable create entry point but reduce it to the two Odoo fields and derive the remaining durable columns server-side | source-backed contract test |
| New posts start as active Draft records | Generic create relied on table defaults without an explicit source-action contract | Generated ID plus explicit active default inserts a durable Draft | create and restart assertions |
| Blog selection is valid, active, and company-scoped | Invalid, archived, and cross-company blog selections were not guarded by the create action | Add ordered empty/title, blog existence/active, and company-scope guards; no partial insert occurs | invalid, archived, cross-company, and unauthorized assertions |

### Core3 contract

- Presentation remains layout-only in `services/blog/pages/posts.yaml` and
  joins `services/blog/api/posts.yaml` by `page.id: blog-posts`.
- `api/posts.yaml` owns the `blog.posts.create` action, generates the post ID,
  enriches `blog_name` and `company_name` from the selected active blog, and
  requires `blog.write`.
- No migration is required: existing `blog_posts` durable columns and table
  defaults are sufficient; the action explicitly sets `active: true` and the
  database default supplies `state: Draft`.
- The source uses Odoo's `target="new"`; Core3's shared `server_form` opens the
  existing ListView modal and refreshes `blog_posts` after the transaction.

### Verification — 2026-09-22

- Focused test: `bun test ./test/blog_post_new.integration.test.ts
  --timeout 20000` passed 4 tests / 22 assertions.
- BrowserSkill desktop/mobile comparison is blocked and makes no visual-parity
  claim. BrowserSkill instance `245ea108` was connected, but borrowing the
  authenticated Odoo user tab was rejected because it was already borrowed by
  team session `wabp`. The BrowserSkill policy forbids reading that tab without
  ownership and forbids an independent login; therefore no desktop/mobile
  captures were created. The exact blocker is recorded under
  `evidence/blog/2026-09-22/BLOG-POST-NEW-001/browser-check.md`.

## Blog Post publishing date slice — 2026-09-22

The next genuinely uncovered bounded source behavior is Odoo's editable
`blog.post.post_date` field. `website_pages_views.xml` exposes `post_date` in
the Blog Post form's Publishing Options group, while `models/website_blog.py`
computes it from `published_date` or `create_date` and writes an edited value
back through the `published_date` inverse. Core3 previously displayed only a
read-only Published on value and could not persist a scheduled/publishing date.

Stable ID: `BLOG-POST-DATE-001`.

### Gap matrix

| Odoo behavior | Existing Core3 gap | Bounded change | Verification |
| --- | --- | --- | --- |
| Blog Post form exposes editable Publishing date | Detail form showed `published_date` as read-only | Expose the date in the shared Odoo form and include it in the existing edit contract | page/API and Odoo source assertions |
| `post_date` inverse persists through `published_date` | No date field was accepted by the edit mutation | Map the projected Odoo date to durable `blog_posts.published_date` with blank-to-null normalization | persisted update, clear, and reload assertions |
| Date edits honor model and actor boundaries | Edit accepted no date validation specific to this field | Add ISO/date-time validation, company/missing guards, required row version, and existing `blog.write` permission | invalid, unauthorized, stale, and wrong-company assertions |

### Core3 contract

- Presentation remains layout-only in `services/blog/pages/post-detail.yaml`.
- `services/blog/api/post-detail.yaml` remains the matching backend contract;
  its `published_date` field is the durable inverse storage for Odoo's
  computed `post_date` projection. The existing `post_date` list/kanban
  projection continues to fall back to `created_at` when the inverse is null.
- No migration is required because `blog_posts.published_date` already exists.
- Date edits require `blog.write`; read/detail access remains `blog.read`, and
  row-version, company, missing-record, invalid-date, and blank-date behavior
  remain explicit and atomic.

### Acceptance checklist

- Blog Post detail visibly labels the Odoo Publishing date and the edit form
  can save a valid date/time or clear it back to the create-date projection.
- Invalid, stale, missing, wrong-company, and read-only requests fail without
  changing the post; valid changes survive file-backed restart and migration
  replay.
- BrowserSkill desktop/mobile captures for the live Odoo action and Core3 route
  are retained under `evidence/blog/2026-09-22/BLOG-POST-DATE-001/`. If either
  runtime or tab ownership is unavailable, the exact blocker and absence of
  paired visual-parity evidence are recorded.

## Blog Post SEO metadata slice — 2026-09-22

The next smallest uncovered source-backed `blog.post` feature is the Odoo
Website SEO metadata contract. `website_blog.models.website_blog.BlogPost`
inherits `website.seo.metadata`; the mixin persists Website Meta Title,
Website Meta Description, Website Meta Keywords, and Website OpenGraph Image,
and computes `is_seo_optimized` when the first three values are present. The
Blog Post form exposes these fields in its SEO page, and Blog Post Pages shows
the optimization state in the list. Core3 previously had none of these
columns, projections, or mutations.

Stable ID: `BLOG-POST-SEO-001`.

### Gap matrix

| Odoo behavior | Existing Core3 gap | Bounded change | Verification |
| --- | --- | --- | --- |
| `blog.post` inherits four SEO metadata fields and computes `is_seo_optimized` | `blog_posts` stored no SEO metadata and post reads exposed no optimization state | Add idempotent Blog-owned columns, deterministic published-post metadata, and computed SQL projections | migration replay, source trace, list/detail/public query assertions |
| Blog Post form exposes the SEO page | Core3 detail had no SEO group or action | Add the layout-only SEO Metadata group and `Edit SEO Metadata` API action joined by `page.id` | page/API separation and Odoo XML assertions |
| SEO edits persist with model/actor boundaries | No SEO mutation, validation, company scope, or stale guard existed | Add `blog.write` mutation with length limits, unsafe OpenGraph URL rejection, row-version guard, and atomic NULL normalization | valid/clear, invalid, permission, company, stale, and restart tests |

### Core3 contract

- Schema/data: migrations `20260922200000-010-blog-post-seo-metadata.yaml` and
  `20260922201000-011-blog-post-seo-metadata-demo.yaml` add four nullable
  metadata columns and seed `blog-post-demo-001` idempotently.
- Presentation remains layout-only in `services/blog/pages/posts.yaml` and
  `services/blog/pages/post-detail.yaml`; the backend remains in the matching
  `api/posts.yaml` and `api/post-detail.yaml` contracts.
- `update_blog_post_seo` requires `blog.write`, checks the current company and
  row version, limits title/description/keywords/OpenGraph URL lengths to
  160/320/255/2048 characters, rejects `javascript:` OpenGraph URLs, and
  normalizes blank values to NULL. `is_seo_optimized` is true only when title,
  description, and keywords are all non-empty.
- Published public operations project the same read-only metadata under their
  existing active/published guards. Public head rendering remains outside this
  bounded slice because the current Blog public renderer has no declared SEO
  head contract.

### Verification — 2026-09-22

- Focused test: `bun test ./test/blog_post_seo.integration.test.ts
  --timeout 20000` passed 4 tests / 32 assertions.
- Full Blog wildcard: `bun test ./test/blog*.integration.test.ts
  --timeout 20000` passed 56 tests / 339 assertions. UI audit passed with 865
  pages, 873 routes, and 1,829 datasources; Blog Sass and targeted ESLint
  passed; `git diff --check` passed before commit.
- BrowserSkill connected to Odoo at `http://localhost:8069` using the task
  session and the `core3_reference` database. `/blog?db=core3_reference`
  returned Odoo Error 404 at 1916x833 and 390x844; the reference has no
  Website/Blog addon/menu. The existing authenticated user tab could not be
  borrowed before the checkpoint, so no credentials were used or exposed.
- A scoped Core3 runtime loaded at `http://127.0.0.1:4311`, but the task tab
  redirected to Core3 sign-in. The authorized help request was cancelled at
  the checkpoint; no authenticated Core3 capture exists. Odoo and Core3
  paired visual parity is blocked and no visual-parity claim is made. Complete
  evidence is under `evidence/blog/2026-09-22/BLOG-POST-SEO-001/`.
