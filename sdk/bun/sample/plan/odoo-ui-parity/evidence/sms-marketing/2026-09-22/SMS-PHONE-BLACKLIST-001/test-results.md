# Test results

Command:

```text
bun test ./test/sms_marketing_phone_blacklist.integration.test.ts --timeout 20000
```

Result: **3 passed, 40 expectations, 0 failed**.

Coverage includes source/menu mapping, page/API joins, deterministic active and
archived reads, normalization, duplicate and invalid input rejection, CRUD,
stale and state guards, missing records, permission metadata, transport error
metadata, and migration replay.

Additional scoped checks:

- `bun scripts/audit-order-ui.ts` - passed: 799 pages, 808 routes, 1,646 datasources.
- Core3 readiness probe - blocked: no listeners on 3001, 3002, or 4330; all three `/api/modules` probes returned HTTP `000` within three seconds.
