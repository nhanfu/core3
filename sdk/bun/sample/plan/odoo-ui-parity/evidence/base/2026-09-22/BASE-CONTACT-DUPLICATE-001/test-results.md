# Test results

Executed from `sdk/bun/sample`:

```text
bun test ./test/base_contact_duplicate.integration.test.ts ./test/base_contacts.integration.test.ts
13 pass, 0 fail, 132 expect() calls, 8.29s

bun run audit
UI audit: 799 pages, 808 routes, 1646 datasources
UI audit passed

bun run frontend:build
Vite build passed (184 modules, 523ms)

git diff --check
passed
```

The duplicate suite covers page/API ownership, API action wiring, field/tag
copying, permission/state guards, deterministic second-copy naming, and
file-backed restart durability.
