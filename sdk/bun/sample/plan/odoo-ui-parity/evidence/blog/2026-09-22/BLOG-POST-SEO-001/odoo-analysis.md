# Odoo analysis

- `addons/website/models/mixins.py` defines `website.seo.metadata` with
  `website_meta_title`, `website_meta_description`, `website_meta_keywords`,
  `website_meta_og_img`, and stored computed `is_seo_optimized`.
- `addons/website_blog/models/website_blog.py` includes
  `'website.seo.metadata'` in `BlogPost._inherit`.
- `addons/website_blog/views/website_pages_views.xml` exposes the SEO page with
  Meta Title, Meta Description, Meta Keywords, and the Blog Post list's
  `is_seo_optimized` field.
- The local reference database does not have `website_blog` installed, so the
  live `/blog` action could not be exercised.
