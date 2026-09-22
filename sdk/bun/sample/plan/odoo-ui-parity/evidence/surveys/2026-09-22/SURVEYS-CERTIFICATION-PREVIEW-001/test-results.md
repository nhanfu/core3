# Test results

- `bun test ./test/surveys_certification_preview.integration.test.ts --timeout 20000`
  — 3 passed, 18 assertions.
- Adjacent regression command:
  `bun test ./test/surveys_certification_preview.integration.test.ts ./test/surveys_certification_template.integration.test.ts ./test/surveys_scoring_settings.integration.test.ts ./test/surveys_time_limit_settings.integration.test.ts ./test/surveys.integration.test.ts --timeout 20000`
  — all listed tests passed.
- `bun run audit` — passed; 813 pages, 822 routes, 1,696 datasources.
- `bun run frontend:build` from `sdk/bun/sample` — passed; CSS and Vite
  frontend build completed.
- `git diff --check` — passed.

Focused assertions cover YAML page/API binding, Preview action routing, the
six Odoo layout values, active-certified filtering, six deterministic preview
blocks, and missing/non-certified/archived empty states.
