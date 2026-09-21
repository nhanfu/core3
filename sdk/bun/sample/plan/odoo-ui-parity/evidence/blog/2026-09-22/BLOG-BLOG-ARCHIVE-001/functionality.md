# BLOG-BLOG-ARCHIVE-001 functionality evidence

- Focused test: `bun test ./test/blog_blog_archive.integration.test.ts
  --timeout 20000`
- Result: 4 tests passed, 25 assertions.
- Page/API contract: `pages/blogs.yaml` has no datasource declarations and
  joins `api/blogs.yaml` through `page.id: blog`; the active datasource and
  archive transitions are backend-owned.
- Archive: `active=true / row_version=1` becomes
  `active=false / row_version=2`; both child posts become inactive Archived,
  unpublished, and version 2.
- Unarchive: `active=false / row_version=2` becomes
  `active=true / row_version=3`; both child posts become active Draft, remain
  unpublished, and version 3.
- A read/write actor without `blog.manage` receives 403. A stale parent
  version receives 409 and leaves the parent and child rows unchanged.
- File-backed restart reopens the archived parent and cascaded children with
  the same durable state after migrations are reapplied.

This is bounded feature evidence, not full Blog module sign-off.
