# Test results

Command:

```text
bun test test/surveys_card_color.integration.test.ts
```

Result: **3 passed, 0 failed, 18 assertions**.

Covered cases: YAML page/API binding and discovery, color 7 persistence,
0..11 validation, actor/permission boundary, missing and archived rows, stale
row replay, and file-backed restart/source projection.

Relevant regression:

```text
bun test test/surveys*.integration.test.ts
217 passed, 6 failed, 1,807 assertions across 223 tests / 75 files
```

The four migration rollback failures are the existing DuckDB dependent-entry
blocker. The two 5-second timeout failures occurred only under the full-suite
load; rerunning `surveys_public_question_image.integration.test.ts` and
`surveys_public_end_message.integration.test.ts` in isolation passed **5/5
tests and 34 assertions**. The new Color test and all adjacent card,
access, scoring, time-limit, and base Surveys tests pass.
