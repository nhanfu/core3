# Test results

Focused test:

- `bun test test/surveys_card_edit.integration.test.ts`

Result: **1 pass, 0 fail, 7 assertions**.

Adjacent regression command:

- `bun test test/surveys_card_edit.integration.test.ts test/surveys.integration.test.ts test/surveys_delete.integration.test.ts test/surveys_question_create.integration.test.ts test/surveys_question_edit.integration.test.ts`

Result: **32 pass, 0 fail, 295 assertions**.

Build and static checks:

- `bun run css:build:global` — pass.
- `bun run css:build:surveys` — pass.
- `bun run frontend:build` — pass; Vite transformed 184 modules.
- `bun run audit` — pass; 829 pages, 837 routes, 1728 datasources.
- `bunx eslint test/surveys_card_edit.integration.test.ts` — pass.
- `git diff --check` — run before commit.

The test asserts the `surveys` page/API `page.id` join, exact Odoo action label,
write permission, durable detail route, discovery registration, and seeded
survey target.
