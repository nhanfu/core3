# Test results

Command:

```text
bun test test/surveys_card_delete.integration.test.ts
```

Result: **2 passed, 0 failed, 16 assertions**.

Coverage includes page/API `page.id` binding, exact card menu action and
permission, discovery registration, reuse of the durable delete mutation,
dependent graph deletion, empty Cards source behavior, and safe missing-record
replay handling.
