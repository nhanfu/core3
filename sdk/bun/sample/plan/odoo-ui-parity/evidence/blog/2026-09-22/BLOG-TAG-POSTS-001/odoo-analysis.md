# Odoo source and live analysis

Local Odoo 19 source:

- `addons/website_blog/views/website_blog_views.xml:54-63` defines the Blog
  Tag list and includes `name`, `category_id`, `color`, and `post_ids`.
- `addons/website_blog/views/website_blog_views.xml:67-83` defines `blog_tag_form`
  with Name, Category, Color, the `Used in: ` label, and `post_ids`.
- `addons/website_blog/views/website_blog_views.xml:85-91` binds the Blog Tags
  action to `list,form` at `/blog-tags`.
- `addons/website_blog/models/website_blog.py:145-158` declares `blog.tag`,
  including the required unique name; line 153 declares `post_ids` as a
  Many2many to `blog.post`.

Live authenticated reference:

- `http://localhost:8069/odoo` loaded with the existing QA session, but the
  launcher exposed no Website or Blog menu.
- `http://localhost:8069/blog` returned the authenticated Odoo Error 404 page
  on desktop and under iphone-14 emulation.
- Therefore local Odoo source is the behavior authority for this slice and no
  live Blog visual comparison is claimed.
