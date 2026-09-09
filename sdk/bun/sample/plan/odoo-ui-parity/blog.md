# Blog — UI-only sub-plan

Status: `planning`

## Reference and source availability

- Odoo addon: `website_blog`; supplied Odoo 19 source: available; verify demo-data flag.
- Core3 service: `blog` (`sdk/bun/sample/services/blog`), YAML-driven composition for admin/public views.

## Menu, action, route, and view inventory

- Blog (`/blog`) / Content → Blogs: channel list/detail, name/subtitle/website/published settings, create/edit/archive, empty.
- Content → Blog Posts (`/blog-posts`): list/card, search/filter/group/sort/pager, draft/published/scheduled/archived, author/blog/tags, create/edit/duplicate/archive.
- Post detail: title, cover, body/blocks, author/tags/date, SEO/visibility, preview, publish/unpublish, comments where visible, validation/dialogs.
- Content → Tags (`/blog-tags`): tag list/form, usage count, CRUD/archive, empty.
- Reporting → Blog Analysis (`/blog-analysis`): KPI, post/visit/comment chart/table, date filters/no-data.
- Public/mobile index, tag filter, reading page, pagination, comments/CTA, responsive cover/body/nav.

## YAML composition and backend mock-data plan

Page YAML contains layout and datasource IDs only. Backend datasource YAML owns `mock_data` for blogs, posts/detail/body blocks, tags, authors, comments, SEO, analysis KPI/chart/table rows, and publish actions. Include multiple channels/posts and all status states, body sections/cover assets, filters/search/pager/empty/no-data, comment counts, and exact chart labels/values. Keep admin/public fixture states deterministic.

## Shared UI primitives

Reuse website editor/composition, list/card/form, rich text/block sections, tag selector, publish/statusbar, preview, public article, comments, KPI/chart/date filter, dialogs/toasts, responsive nav. Record missing primitives before implementation.

## Screenshots

Capture Odoo 19/Core3 at `1440x900` and `390x844`: blog/post list/detail/editor/preview, tags, publish dialog, analysis populated/no-data, public index/post/tag/comments, draft/empty/error. Record route/state/viewport/path.

## Acceptance

- Admin/public menus, editor, publish workflow, reading layout, tags, comments, analysis, and mobile behavior match.
- Every visible post/body/comment/chart/metric has backend `mock_data`; page YAML has no records and renders offline.
- Search/filter/group/pager, lifecycle, preview, tag filtering, empty/no-data, validation/permission states are deterministic; visual review and `git diff --check` are clean.
