# Test results

Command:

```text
bun test ./test/website_settings.integration.test.ts --timeout 20000
```

Result: 4 tests passed, 21 assertions, 0 failures.

Coverage includes Odoo source anchors and page/API binding, durable per-site
save behavior, validation and stale guards, permission declarations, and
file-backed DuckDB restart with migration replay.
