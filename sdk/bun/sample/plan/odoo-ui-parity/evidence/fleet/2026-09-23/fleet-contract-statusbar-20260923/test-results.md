# Test results

Focused:

```text
bun test test/fleet_contract_statusbar.integration.test.ts --timeout 30000
3 pass, 0 fail, 35 expect() calls
```

Adjacent regression:

```text
bun test test/fleet_contract_statusbar.integration.test.ts test/fleet_contracts.integration.test.ts test/fleet_vehicle_statusbar.integration.test.ts --timeout 30000
11 pass, 0 fail, 121 expect() calls
```

The focused suite covers Odoo source mapping, exact page/API action binding,
page discovery, durable status transitions, optimistic concurrency, and the
closed-state guard.
