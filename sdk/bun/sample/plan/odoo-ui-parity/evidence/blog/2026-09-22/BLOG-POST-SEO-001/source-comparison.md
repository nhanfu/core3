# Source comparison

| Odoo 19 source | Core3 YAML/service | Classification |
| --- | --- | --- |
| `website.seo.metadata` fields and computed optimization | `blog_posts` SEO migration plus SQL projections in `api/posts.yaml`, `api/post-detail.yaml`, and `operations.yaml` | implemented for bounded contract |
| `BlogPost._inherit = ['website.seo.metadata', ...]` | Source-backed test and Blog-owned durable schema | implemented |
| Blog Post form SEO page and list optimization field | `pages/post-detail.yaml` SEO Metadata group and `pages/posts.yaml` SEO Optimized column | implemented declaratively |
| Odoo metadata write behavior | `update_blog_post_seo`, `blog.write`, validation, company scope, stale guard, NULL normalization | implemented with documented Core3 action boundary |
| Odoo authenticated Blog screen | `core3_reference` has no Website/Blog addon; Core3 auth was not completed | blocked; no visual claim |
