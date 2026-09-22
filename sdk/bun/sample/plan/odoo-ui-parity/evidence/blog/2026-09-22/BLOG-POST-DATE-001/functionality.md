# Functionality checklist

| Assertion | Result |
| --- | --- |
| Page/API contracts join by `page.id: blog-post-detail` | pass |
| Valid Publishing date persists through `blog_posts.published_date` | pass |
| Clearing the date stores NULL and projects the durable create date | pass |
| Row-version stale update is rejected without a write | pass |
| Read-only actor receives 403 | pass |
| Invalid date, missing post, and wrong-company blog are rejected atomically | pass |
| File-backed restart preserves the inverse and projection | pass |
| Odoo/Core3 authenticated desktop comparison at 1440x900 | blocked; no owned Odoo tab |
| Odoo/Core3 authenticated mobile comparison at 390x844 | blocked; no owned Odoo tab |
