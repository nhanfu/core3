# Test results

Focused command:

```text
bun test test/time_off_second_approval.integration.test.ts
3 pass
0 fail
20 expect() calls
```

Full Time Off regression command:

```text
bun test test/time_off*.integration.test.ts
69 pass
0 fail
689 expect() calls
Ran 69 tests across 25 files.
```

The suite covers YAML page/API contracts, guards, migration idempotency,
balance application, approval audit persistence, and file-backed restart.
