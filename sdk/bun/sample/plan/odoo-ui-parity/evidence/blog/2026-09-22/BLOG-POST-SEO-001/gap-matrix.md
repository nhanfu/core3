# Gap matrix

| Odoo source behavior | Before | Core3 result | Evidence |
| --- | --- | --- | --- |
| SEO metadata mixin fields | No `blog_posts` columns | Four durable nullable columns and deterministic fixture | `010`/`011` migrations; focused test |
| `is_seo_optimized` projection | Missing from list/detail/public reads | SQL projection is true only for non-empty title, description, and keywords | focused test |
| Blog Post SEO form | No SEO group or action | Layout group plus `Edit SEO Metadata` server form | page/API source assertions |
| Permission and persistence | No mutation or guards | `blog.write`, company/stale/length/safety guards, restart durability | focused test |
| Authenticated visual state | Reference route unavailable | Not claimed | `browser-check.md` and blocker captures |
