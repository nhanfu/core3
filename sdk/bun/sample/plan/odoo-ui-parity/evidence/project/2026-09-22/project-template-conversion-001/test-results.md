# Contract and persistence results

Commands run from `sdk/bun/sample`:

- `bun test ./test/project_template_conversion.integration.test.ts --timeout 30000`
  - 4 passed, 0 failed, 27 assertions
- `bun test ./test/project*.integration.test.ts --timeout 30000`
  - 76 passed, 0 failed, 752 assertions across 26 files
- `bun run audit`
  - 842 pages, 850 routes, 1,755 datasources; passed
- `bun run css:build:project` — passed
- `bun run frontend:build` — passed; 184 modules transformed
- `git diff --check` on the bounded implementation files — passed

The focused suite proves page/API binding, source action identity, durable
template and task-template creation, source archival, idempotent migration
replay, file-backed close/reopen persistence, and missing/invalid/
unconfirmed/stale/replay guards.
