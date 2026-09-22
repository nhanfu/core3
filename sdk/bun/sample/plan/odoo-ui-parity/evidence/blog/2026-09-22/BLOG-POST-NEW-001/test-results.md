# Test results

Focused command:

```text
bun test ./test/blog_post_new.integration.test.ts --timeout 20000
4 pass, 0 fail, 22 expect() calls
```

The focused test covers source mapping, page/API separation, successful
creation, derived scope, active/Draft defaults, invalid and archived parent
guards, company isolation, permission enforcement, atomic no-row behavior, and
file-backed restart persistence.

Final validation:

```text
bun test ./test/blog*.integration.test.ts --timeout 20000
46 pass, 0 fail, 269 expect() calls
bun run audit
UI audit: 831 pages, 839 routes, 1732 datasources
bunx eslint sample/test/blog_post_new.integration.test.ts
pass
git diff --check
pass
bun run css:build:blog
pass
bun run frontend:build
pass
```
