# BLOG-POST-ARCHIVE-001 source comparison

## Odoo 19 source

- `addons/website_blog/views/website_pages_views.xml` defines the Blog Post
  Pages list/search action and its Archived filter.
- `addons/website_blog/models/website_blog.py` defines `BlogPost.active` and
  forces `is_published = False` when `active` is written false.
- The local authenticated `core3_reference` browser profile has no Website or
  Blog menu installed; `/blog` returns Odoo Error 404. Source inspection is
  therefore authoritative for this slice, with no live visual-parity claim.

## Core3 implementation

- `services/blog/migrations/20260921100000-009-blog-post-archive.yaml` adds,
  backfills, and indexes `blog_posts.active`.
- `services/blog/pages/posts.yaml` declares the active-only default, record
  filter, hidden active column, and Archive/Unarchive actions.
- `services/blog/pages/blog-workflow.yaml` persists archive/unarchive state;
  archiving clears publication date and unarchiving returns to Draft.
- `services/blog/operations.yaml` prevents inactive posts from public list and
  detail reads.
- `test/blog_post_archive.integration.test.ts` exercises persistence,
  workflow, filtering, and permission enforcement.

Page YAML remains presentation-only. Datasource SQL, actions, permissions, and
workflow mutations remain in the Blog backend contracts.
