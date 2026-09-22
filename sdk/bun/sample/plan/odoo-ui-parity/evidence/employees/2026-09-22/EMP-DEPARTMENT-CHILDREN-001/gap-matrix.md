# Gap matrix

| Boundary | Result | Notes |
| --- | --- | --- |
| Local Odoo source mapping | pass | Model action and kanban menu were read from the local Odoo checkout. |
| Core3 page/API separation | pass | Separate YAML files use `employee-department-children` on both sides. |
| Durable hierarchy | pass pending test execution | Migration 094 adds and backfills `parent_id` and creates an index. |
| CRUD/workflow | bounded read-only | This action only lists departments and opens an existing detail view. |
| Permission boundary | pass by contract | All entry points require `employees.read`. |
| Error/empty guards | pass pending test execution | Missing root, transport error, search empty, and page empty state are represented. |
| Desktop/mobile visual parity | blocked | Borrow request failed because tab `1770662590` was owned by session `zfuv`. |
