# Test results

- Focused: `bun test ./test/manufacturing_unbuild_product_moves.integration.test.ts`
  — 3 passed, 36 assertions.
- Manufacturing corpus attempt: `bun test ./test/manufacturing_*.integration.test.ts`
  — 81 passed / 24 failed across 105 tests. The failures are discovery errors
  from unrelated concurrent Base activity YAML edits (`cancel_activities`,
  `reschedule_activity_*`, and related actions missing); the isolated test
  uses a temporary Manufacturing-only discovery root and remains green.
- `git diff --check` — passed before evidence recording.

Coverage includes source action identity, page/API separation, route
discovery, stat navigation, deterministic move/search/empty/not-found/503
states, company scope, migration replay, index idempotence, and file-backed
restart persistence.
