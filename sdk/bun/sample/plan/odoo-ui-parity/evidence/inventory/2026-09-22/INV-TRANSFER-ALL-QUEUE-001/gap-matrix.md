# Gap matrix

| Gap | Required change | Evidence |
| --- | --- | --- |
| Operation-card `All` had no Core3 route/action | Add overview navigate action and `transfer-all` page/API pair | focused test, YAML files |
| No company/operation-scoped all-transfer datasource | Query durable `inventory_pickings` and `inventory_operation_types` with both scopes | focused test |
| No durable queue refresh context | Add migration `0.0.88` context and run ledger | restart test |
| No bounded error/permission contract | Declare 403/404/503 states and `inventory.read` guards | focused test/schema validation |
| No authenticated visual evidence | Capture through bsk/Core3 runtime | blocked and recorded in `verification.md` |
