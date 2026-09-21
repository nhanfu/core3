# Test results

Focused command:

```text
bun test ./test/sms_marketing_delivery_retry.integration.test.ts --timeout 20000
```

The test covers source mapping, page/API separation, datasource discovery,
idempotent migrations, trace filters and empty state, retry transition,
permission/error contracts, stale/company/state guards, and file-backed restart
persistence. The final result is recorded in the module QA ledger and the
handoff report.

Result: **4 passed, 33 assertions, 0 failures**.

SMS regression command:

```text
bun test ./test/sms_marketing*.integration.test.ts --timeout 20000
```

Result: **23 passed, 208 assertions, 0 failures** across 7 SMS test files.

UI audit: `bun scripts/audit-order-ui.ts` from `sdk/bun/sample` — **passed**,
776 pages, 785 routes, 1,593 datasources.

Sass compilation: `bunx sass sample/services/sms-marketing/styles/index.scss
/tmp/core3-sms-delivery-retry.css --no-source-map` — **passed**.

Scoped ESLint for the new and affected SMS tests — **passed with no warnings**.
