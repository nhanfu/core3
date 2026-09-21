# BLOG-POST-KANBAN-001 source comparison

## Odoo 19 source

- `addons/website_blog/views/website_pages_views.xml:45-77` defines
  `blog_post_view_kanban` for `blog.post` with the post title, blog, post date,
  author avatar, and Published/Not Published footer state.
- `addons/website_blog/views/website_pages_views.xml:121-131` binds the
  `action_blog_post` window to `list,kanban,form`, with the Blog Post Pages
  action under Website > Content.
- `addons/website_blog/models/website_blog.py` provides durable `active`,
  `published_date`, `author_name`, and publication state fields used by the
  card. No new schema field is required for this bounded view slice.

## Core3 implementation

- `services/blog/pages/posts.yaml` is presentation-only and adds visible List
  and Kanban tabs. The Kanban card declares the Odoo-backed title, blog,
  post-date, author, and publication-status fields and reuses the shared
  responsive ListView runtime.
- `services/blog/api/posts.yaml` matches `page.id: blog-posts`, owns the real
  `blog_posts` query, active/state filters, permissions, error contracts, and
  existing create/import/publication/archive actions. `post_date`,
  `is_published`, and `publication_status` are derived from durable post
  columns for the card.
- Existing `blog_posts` schema and migrations are reused; no migration is
  needed. The focused test reopens a file-backed DuckDB database after
  migrations are reapplied and verifies the same card state.

The Odoo reference database has no installed Website/Blog module, so the local
Odoo source is the behavior authority for this slice and no live visual parity
claim is made.
