# Test results

- `bun test sample/test/base_contacts_export.integration.test.ts`: 3 tests,
  19 assertions passed.
- `bun test sample/test/base_contacts.integration.test.ts`: 10 tests,
  108 assertions passed.
- `bun run audit`: passed — 819 pages, 828 routes, 1,707 datasources.
- `bun run frontend:build`: passed — CSS build and Vite production build.
- `bunx eslint sample/test/base_contacts_export.integration.test.ts`: passed.
- `git diff --check`: passed.

BrowserSkill visual evidence remains blocked by the shared signed-in Contacts
tab being borrowed by another session; see `browser-check.md`.
