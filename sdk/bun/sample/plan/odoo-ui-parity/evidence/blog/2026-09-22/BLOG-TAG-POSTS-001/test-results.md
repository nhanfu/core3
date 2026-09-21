# Test results

- `bun test ./test/blog_tag_posts.integration.test.ts --timeout 20000` — pass,
  4 tests / 26 assertions.
- The focused suite verifies page/API separation, source-backed form fields,
  relation add/remove, duplicate/invalid/stale guards, read/write permission
  boundary, synchronized post names, and file-backed restart persistence.
- `bun test ./test/blog*.integration.test.ts --timeout 20000` — pass, 39 tests
  / 225 assertions.
- `bun run audit` — pass, 802 pages / 811 routes / 1,656 datasources.
- `bun run css:build:blog` — pass.
- `bunx eslint services/blog/module.ts test/blog_tag_posts.integration.test.ts`
  — pass with no warnings.
- `git diff --check` — pass.
- `bunx tsc --noEmit -p tsconfig.json` — blocked by pre-existing repository
  TypeScript errors in `../med/src/event-store.ts`, shared client components,
  `packages/server/src/routes/yaml-api.ts`, and unrelated service files; no
  errors were reported in the new Blog test or Blog YAML contracts.
