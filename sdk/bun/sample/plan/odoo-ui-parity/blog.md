# Blog parity — configuration slice

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
