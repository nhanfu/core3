# Test results

- bun test test/events_tag_lines.integration.test.ts --timeout 20000 — 2
  passed, 23 assertions.
- bun test ./test/events*.integration.test.ts --timeout 20000 — 109 passed,
  0 failed, 813 assertions across 39 files.
- bun run audit — passed; 829 pages, 837 routes, 1,728 datasources.
- bun run css:build:events — passed.
- bun run frontend:build — passed; Sass and Vite production build completed.
- bunx eslint test/events_tag_lines.integration.test.ts — passed.
- git diff --check — passed.

The repository contained unrelated concurrent CRM, Surveys, and plan changes;
they were preserved and are not part of this feature's evidence or commit.
