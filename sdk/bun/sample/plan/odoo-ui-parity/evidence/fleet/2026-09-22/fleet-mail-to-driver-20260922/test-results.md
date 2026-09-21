# Test results

Command:

```text
bun test test/fleet_vehicle_mail.integration.test.ts --timeout 30000
```

Result: **3 passed, 27 assertions, 0 failures**.

Coverage includes exact Odoo source mapping, matching page/API IDs, migration
replay, selected-driver message persistence, file-backed restart, template
creation and duplicate protection, actor/company/selection/vehicle/email/
template/content guards, and no partial writes after rejected sends.
