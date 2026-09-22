# BLOG-BLOG-REORDER-001

## Scope

This bounded slice maps Odoo `blog.blog` ordering to the Core3 Blog Blogs
contract. Odoo's `view_blog_blog_list` declares `sequence` with the `handle`
widget, and the model uses that field to order Blogs. Core3 now exposes guarded
Move to Top, Move Up, Move Down, and Move to Bottom actions over the existing
durable `blog_blogs.sequence` column.

## Owned files

- `services/blog/pages/blogs.yaml`
- `services/blog/api/blogs.yaml`
- `test/blog_blog_reorder.integration.test.ts`

No migration was needed: `blog_blogs.sequence` and `row_version` already exist.

## Verification

- Focused test: `bun test ./test/blog_blog_reorder.integration.test.ts --timeout 20000`
- The test covers the Odoo source handle, page/API separation, all four actions,
  write permission declarations, refresh targets, persistence, adjacent swaps,
  top/bottom placement, row-version stale rejection, company scope, and edge
  guards.
- Browser limitations are recorded in `browser-check.md`; no visual-parity
  claim is made.
