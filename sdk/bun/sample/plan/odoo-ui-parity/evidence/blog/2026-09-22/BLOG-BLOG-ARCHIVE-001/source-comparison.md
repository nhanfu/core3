# BLOG-BLOG-ARCHIVE-001 source comparison

## Odoo 19 source

- `addons/website_blog/models/website_blog.py` defines `BlogBlog.active` with
  a true default and `BlogBlog.write()` propagates an active change to all
  related `blog.post` records.
- `addons/website_blog/views/website_blog_views.xml` includes the active field
  in the Blogs list as invisible and exposes the Archived search filter.
- The local authenticated `core3_reference` profile has no Website or Blog
  menu installed, and `http://localhost:8069/blog` returns Odoo Error 404.
  Source inspection is therefore authoritative for behavior; no live visual
  parity is claimed.

## Core3 implementation

- `services/blog/pages/blogs.yaml` remains layout-only and now declares the
  active-only default, Records filter, hidden active status field, and row
  action references.
- `services/blog/api/blogs.yaml` matches the page with `page.id: blog`, owns
  the active-state datasource, and declares `blog.manage` archive/unarchive
  actions.
- `services/blog/pages/blog-blog-workflow.yaml` persists parent active state
  with row-version/company guards and atomically cascades inactive Archived
  child posts; unarchive restores active Draft without republishing.
- `services/blog/operations.yaml` requires an active parent blog for public
  post list/detail reads.
- No migration was required: `blog_blogs.active` is present in the module's
  baseline schema. The test verifies that parent and child states survive a
  file-backed database restart.

Page YAML remains presentation-only. Datasource SQL, actions, permissions, and
workflow mutations remain in the Blog backend contracts.
