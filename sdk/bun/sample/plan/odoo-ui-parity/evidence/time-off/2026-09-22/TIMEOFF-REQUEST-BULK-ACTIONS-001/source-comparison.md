# Source comparison

| Odoo source contract | Core3 contract | Result |
| --- | --- | --- |
| `hr_leave_view_tree` declares header `Approve` and `Refuse` object buttons for selected rows | `pages/time-off-approval.yaml` declares `selectable: true` and matching `bulk_actions` | PASS |
| `action_approve` transitions pending `hr.leave` records according to leave-type validation | `approve_selected_requests` applies manager approval or `Second Approval` based on `time_off_leave_validation_types` | PASS |
| Final approval changes leave usage and records the approver | Bulk approval updates `leave_balances`, `leave_requests.approver`, and approval audit rows | PASS |
| `action_refuse` refuses pending requests | `refuse_selected_requests` updates pending durable requests to `Refused` with actor and reason | PASS |
| Odoo list actions are manager/approver operations | Both Core3 actions require `time_off.manage` | PASS |

The Core3 contract is YAML-first and does not copy Odoo frontend code. Existing
durable tables provide persistence, so this slice adds no migration.
