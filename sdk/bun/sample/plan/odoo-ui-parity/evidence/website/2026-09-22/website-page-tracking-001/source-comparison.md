# Source comparison

| Odoo behavior | Core3 implementation | Status |
| --- | --- | --- |
| Page Manager `Tracked` / `Not tracked` filters | `pages/pages.yaml` filter declarations and `api/pages.yaml` SQL predicates | implemented |
| `Not SEO optimized` filter | `pages/pages.yaml` SEO filter and API predicate | implemented |
| Persistent `track` field | Migration `20260922100000-013-website-page-tracking.yaml` adds/backfills `website_pages.track` | implemented |
| Editor writes tracking state | `api/pages.yaml` and `api/page-detail.yaml` include `track`, boolean normalization, and optimistic concurrency | implemented |
| Odoo authenticated desktop/mobile comparison | Shared Odoo account has no Website application | blocked |

Core3 keeps presentation-only YAML separate from backend datasource/action YAML
through the shared `page.id: website-pages` contract.
