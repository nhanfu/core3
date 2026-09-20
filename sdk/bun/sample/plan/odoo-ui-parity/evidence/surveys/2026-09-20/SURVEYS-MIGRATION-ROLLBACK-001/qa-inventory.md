# QA inventory — SURVEYS-MIGRATION-ROLLBACK-001

## Claims under test

- DuckDB can roll the complete Surveys chain down and replay it without
  losing durable response rows or earlier indexes.
- A response carrying the access-token dependency survives the targeted
  `0.0.17` to `0.0.16` rollback and full replay.
- Existing Survey permission, restart, and actor boundaries remain intact.
- Authenticated desktop/mobile Survey detail remains rendered and responsive;
  an ordinary Fleet actor is refused.

## Checks and evidence

- `test/surveys_migrations.integration.test.ts`: 4 tests, 15 assertions,
  including the dependent-response regression.
- `bun test ./test/surveys*.integration.test.ts`: 45 tests, 374 assertions.
- Full repository regression: 1,379 passed / 3 failed / 12,601 assertions;
  failures are unrelated CRM/Ecommerce concurrent fixture/menu expectations.
- Core3 Admin: desktop 1440x1000 and mobile 390x844, zero page errors,
  zero failed requests, zero overflow.
- Core3 Fleet: mobile `/surveys` returned HTTP 403 with
  `Requires permission: surveys.read`.
- Odoo Admin: desktop/mobile authenticated fallback reached Discuss because
  Surveys is uninstalled in the live reference DB.

These screenshots evidence the bounded gate repair; they do not sign off the
broader Surveys module.
