# Test results

- `bun test test/events_template_tags.integration.test.ts`: 2 tests passed,
  21 assertions.
- Related template regression (`events_template_tags`, `events_template_questions`,
  `events_template_tickets`, `events_template_communication`, and
  `events_templates`): 11 tests passed, 114 assertions.
- `bunx eslint test/events_template_tags.integration.test.ts
  test/events_templates.integration.test.ts
  test/events_template_communication.integration.test.ts`: passed.
- `bun run audit`: passed, 850 pages, 858 routes, 1,790 datasources.
- `bun run frontend:build`: passed.
- `git diff --check`: passed.

The later all-Events glob was not a clean module gate in the shared worktree:
concurrent Livechat edits caused global discovery failures, and some unrelated
file-backed tests then hit `No space left on device` under `/tmp`. No unrelated
module files were changed for this feature.
