# Test results

Focused command:

```text
cd sdk/bun && bun test ./sample/test/sms_marketing_utm_campaigns.integration.test.ts --timeout 20000
```

Result after the feature test was added: **5 passed, 47 expectations, 0
failures**.

The feature assertions cover source mapping, page/API IDs, active-list
selection, durable linked insert, count/row-version persistence, campaign
filtering, and stale-parent rejection.
