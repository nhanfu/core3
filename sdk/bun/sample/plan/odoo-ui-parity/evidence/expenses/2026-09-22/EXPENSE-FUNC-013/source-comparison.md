# Source comparison

| Odoo source behavior | Existing Core3 gap | Change |
| --- | --- | --- |
| My Expenses action includes `activity` after graph/pivot | `/expenses` exposed only List and Kanban | Added the shared Activity view to `pages/expenses.yaml` |
| Activity view has employee/name/amount card metadata | Expenses datasource had no activity fields | Joined `expense_scheduled_activities` in `api/expenses.yaml` |
| Odoo activity types include Expense Approval plus common mail types | No Expenses Activity type declaration | Added the six source-backed Activity type labels |
| Scheduled activities carry deadline, assignee, and state | The list query returned only expense columns | Added stable `activity_*` fields and state derivation |
| Empty Activity view has no records and still offers scheduling affordance | No Activity view or explicit datasource failure contract | Shared ActivityView now renders the empty matrix from the service source; datasource empty/error states are explicit |

The prior `EXPENSE-FUNC-011` detail chatter owns schedule/complete mutations;
this slice only adds the list Activity projection and does not duplicate that
lifecycle implementation.
