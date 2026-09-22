# Functionality evidence

Focused test:

```text
bun test ./test/blog_post_website.integration.test.ts --timeout 20000
3 tests passed, 22 assertions
```

Covered assertions:

- Odoo list and kanban `open_website_url` source mapping.
- Page/API separation joined by `page.id` for Posts and Post detail.
- Read-only `blog.read` client actions on list, kanban row-open, and detail
  surfaces; same-tab navigation matches Odoo's `target="self"` URL action.
- Durable `website_url` values from real `blog_posts` rows.
- Existing active/published public list/detail predicates remain in force.
- No migration was required; the projection derives from the durable post ID.

The slice does not sign off the complete Blog module, full actor matrix, or
paired Odoo visual parity.
