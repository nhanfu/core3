# BLOG-POST-DATE-001 evidence

This bundle covers the bounded Odoo Blog Post Publishing date slice only. It
does not claim full Blog or website_blog parity.

- Stable ID: `BLOG-POST-DATE-001`
- Source: local Odoo 19 `addons/website_blog/views/website_pages_views.xml` and
  `addons/website_blog/models/website_blog.py`
- Core3 contract: `services/blog/pages/post-detail.yaml` joined to
  `services/blog/api/post-detail.yaml` by `page.id: blog-post-detail`
- Focused test: `test/blog_post_date.integration.test.ts`
- Browser comparison: blocked by BrowserSkill tab ownership confirmation; no
  desktop/mobile visual-parity claim is made and no captures were produced.
