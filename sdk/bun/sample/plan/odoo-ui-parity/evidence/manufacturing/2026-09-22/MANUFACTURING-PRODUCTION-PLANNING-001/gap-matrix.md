# Gap matrix

| Stable behavior | Existing Core3 | Change | Result |
| --- | --- | --- | --- |
| `action_mrp_workorder_production` route/action | Missing | Add `production-planning` page/API pair | PASS |
| Active production domain | Global list did not own this action | Join `mrp_productions` and exclude Done/Cancelled | PASS |
| Default Ready/Blocked/In Progress filters | Present only on global Work Orders | Add declarative and SQL defaults | PASS |
| Source five view modes | No production-planning contract | Add List/Form/Calendar/Pivot/Graph tabs | PASS |
| Durable query performance | No production planning index | Add migration `0.0.24` | PASS |
| Odoo visual comparison | Shared tab borrow unavailable | Record blocker; do not claim parity | BLOCKED |
