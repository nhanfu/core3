# Source comparison

| Odoo contract | Core3 implementation | Result |
| --- | --- | --- |
| `confirm` / To Approve | `Submitted` / To Approve | PASS |
| `validate1` / Second Approval | `Second Approval` | PASS |
| `validate` / Approved | `Approved` | PASS |
| `action_approve` first step for `leave_validation_type=both` | `approve_first` order transition | PASS |
| `action_approve` final step | `validate` order transition | PASS |
| First and second approver fields | `time_off_leave_approvals` durable audit table | PASS, semantic storage |
| Balance validation and consumption | Final `validate` mutation updates `leave_balances` once | PASS |
| Refuse from confirm/validate1 | Refuse guards accept Submitted/Second Approval | PASS |
| Cancel from open pending states | Cancel guards accept Draft/Submitted/Second Approval | PASS |
| Odoo Time Off menu and live popup | No live `hr_holidays` surface in `core3_reference` | BLOCKED |
