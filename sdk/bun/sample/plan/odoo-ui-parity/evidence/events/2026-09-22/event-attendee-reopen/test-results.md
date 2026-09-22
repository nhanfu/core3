# Test results

Command:

```text
bun test test/events_attendee_reopen.integration.test.ts --timeout 20000
```

Result: **PASS** — 4 tests, 0 failures, 20 assertions.

Coverage includes page/API discovery, action permission/source mapping,
cancelled-to-unconfirmed CRUD, stale/missing/non-cancelled/replay guards, the
detail action boundary, and file-backed restart persistence.

Regression command:

```text
bun test test/events*.integration.test.ts --timeout 20000
```

Result: **PASS** — 113 tests across 40 files, 0 failures, 836 assertions.
