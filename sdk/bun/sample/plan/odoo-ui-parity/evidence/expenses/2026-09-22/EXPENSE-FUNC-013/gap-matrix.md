# Gap matrix

| Stable ID | Odoo action/view | Core3 implementation | Result |
| --- | --- | --- | --- |
| EXPENSE-FUNC-013-A | `hr_expense_actions_my_all` Activity mode | `/expenses`, `pages/expenses.yaml`, shared `ActivityView` | implemented |
| EXPENSE-FUNC-013-B | Six activity type columns | `activity_types` in page YAML | implemented |
| EXPENSE-FUNC-013-C | Scheduled activity card metadata | `expenses_my` lateral join to `expense_scheduled_activities` | implemented |
| EXPENSE-FUNC-013-D | Search/filter/empty/error behavior | Existing list filters plus deterministic fixture and transport state | implemented |
| EXPENSE-FUNC-013-E | Authenticated Core3 visual comparison | No Core3 capture in this handoff | blocked: browser evidence |
