# Test results

Command:

```text
bun test --max-concurrency 1 test/surveys_public_deadline.integration.test.ts
```

Result: **3 passed, 0 failed, 25 assertions**.

The suite covers the page/API permission contract, 410 deadline guards,
expired no-mutation behavior, active response progress, file-backed restart,
and start replay.
