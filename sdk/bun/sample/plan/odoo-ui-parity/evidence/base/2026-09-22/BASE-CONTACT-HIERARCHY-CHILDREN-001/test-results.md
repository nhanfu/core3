# Test results

Executed from `sdk/bun/sample`:

```text
bun test ./test/base_contact_children.integration.test.ts --timeout 20000
3 pass, 0 fail, 26 expect() calls

bun test ./test/base_*integration.test.ts --timeout 30000
48 pass, 0 fail, 448 expect() calls

bun run audit
UI audit: 834 pages, 842 routes, 1739 datasources
UI audit passed

bun run frontend:build
CSS and Vite production build passed

git diff --check
passed
```

The child suite covers page/API ownership, deterministic reads, empty/error/
company scope, CRUD, required/duplicate/missing/stale guards, and file-backed
restart durability.
