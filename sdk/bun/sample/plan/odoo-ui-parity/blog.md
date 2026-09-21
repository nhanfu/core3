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
