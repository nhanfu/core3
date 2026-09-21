# Functionality checklist

| Case | Expected | Result |
| --- | --- | --- |
| Page/API join | `pages/tag-detail.yaml` is layout-only and joins `api/tag-detail.yaml` by `page.id` | pass |
| Form fields | Name, Category, Color and `Used in` relation are declarative | pass |
| Read | `blog.read` can query tag detail, relation rows, and post lookup | pass by datasource contract |
| Add | `blog.write` adds a valid post, updates normalized relation and legacy names | pass |
| Remove | `blog.write` removes the selected line and synchronizes the post projection | pass |
| Invalid/duplicate | Missing post and duplicate relation return 422/409 with no write | pass |
| Stale/atomic | Parent or line version mismatch returns 409 without partial changes | pass |
| Restart | Relation and synchronized names survive close/reopen and migration replay | pass |
| Responsive/browser | Authenticated desktop/mobile comparison | blocked; exact blocker recorded |
