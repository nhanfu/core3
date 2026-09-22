# Test results

Command:

```text
cd sdk/bun && bun test ./sample/test/sms_marketing_mailing_duplicate.integration.test.ts --timeout 20000
```

Result: **4 passed, 0 failed, 21 expectations**.

Coverage includes Odoo source mapping, page/API binding, deterministic active
migration replay, Draft duplicate persistence, reset counters, stable IDs,
source preservation, permission, company/stale/active/list/content guards, and
isolated page discovery.
