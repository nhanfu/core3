# BLOG-POST-KANBAN-001 functionality evidence

- Focused test: `bun test ./test/blog_post_kanban.integration.test.ts
  --timeout 20000`
- Result: 3 tests passed, 18 assertions.
- Page/API separation: `pages/posts.yaml` contains layout and visible tabs only;
  `api/posts.yaml` has matching `page.id: blog-posts` and owns all post
  datasources/actions.
- Card query: active published and draft posts expose durable `post_date`,
  `is_published`, and `publication_status` values; the archived filter excludes
  inactive rows from the active view and returns them in the archived view.
- Permission/workflow boundary: the datasource requires `blog.read`, declares
  401/403/503 error contracts, and remains bound to the existing `blog_posts`
  workflow for guarded publication/archive state transitions.
- Restart: the file-backed database is closed, migrations are reapplied, and
  the published card state remains available with the same durable values.

This is bounded kanban-view evidence, not full Blog module sign-off.
