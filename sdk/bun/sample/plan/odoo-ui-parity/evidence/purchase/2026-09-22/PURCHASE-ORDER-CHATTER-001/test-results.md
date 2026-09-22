# Test results

Focused command:

```text
bun test test/purchase_order_chatter.integration.test.ts --timeout 30000
```

Result: 4 tests passed, 0 failures.

The test covers source/view mapping, page/API binding, public message and
internal note persistence, actor/content/missing/stale guards, timeline
refresh, migration replay, and file-backed restart.
