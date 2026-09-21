# BLOG-POST-ARCHIVE-001 functionality evidence

- Focused test: `bun test ./test/blog_post_archive.integration.test.ts
  --timeout 20000`
- Result: 3 tests passed, 13 assertions.
- Published post archive: `active=true / Published` →
  `active=false / Archived`, `published_date=NULL`, `row_version=2`.
- Unarchive: `active=false / Archived` → `active=true / Draft`, no automatic
  republish, `row_version=3`.
- Default manager read includes only active posts; the Archived filter is
  declared and backed by the `active` column.
- An actor without `blog.manage` receives HTTP 403 and the post remains
  unchanged.
- `bun run css:build:blog` passed.
- `git diff --check` passed for Blog-scoped paths.

The full Blog wildcard regression was attempted but shared discovery stopped on
an unrelated concurrent duplicate Sales datasource,
`sale_quotation_templates`. This evidence makes no full-suite or module
sign-off claim.

`bun run audit` was also attempted and stopped at the same unrelated duplicate
Sales datasource before producing an audit count.
