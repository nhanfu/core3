# `SURVEYS-SECTION-RANDOM-COUNT-001` verification

- Focused: `bun test test/surveys_section_random_count.integration.test.ts` —
  **3 passed, 34 assertions**. Repeated twice successfully.
- Adjacent: six-file Surveys regression (`section_random_count`, public random
  selection, public sections, question edit, question reorder, suggested
  value reorder) — **17 passed, 159 assertions**.
- Broader: `bun test test/surveys.integration.test.ts` — **23 passed, 220
  assertions**.
- Audit: `bun run audit` — **764 pages, 773 routes, 1,555 datasources**;
  shared-page audit passed.
- Lint: `bunx eslint services/surveys/module.ts
  test/surveys_section_random_count.integration.test.ts` — passed.
- Diff check: `git diff --check` — passed.

The focused suite covers page/API pairing, migration, actor/permission,
missing/non-section, parent/stale, range, deterministic section sampling,
idempotent start, and file-backed restart replay.
