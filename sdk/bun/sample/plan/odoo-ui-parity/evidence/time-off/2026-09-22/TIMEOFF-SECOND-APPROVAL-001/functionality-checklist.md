# Functionality checklist

| Case | Result | Evidence |
| --- | --- | --- |
| Two-step state contract and labels | PASS | Focused test declaration case |
| Page/API `page.id` seam | PASS | `leave-request-detail` assertions |
| First approval requires `both` validation type and current row version | PASS | `approve_first` guard and workflow test |
| Final Validate requires `Second Approval`, `both`, and sufficient balance | PASS | `validate` guard and workflow test |
| Balance applies exactly once at final validation | PASS | Used-days assertion and repeated-validation conflict |
| First/second approver audit persists | PASS | `time_off_leave_approvals` assertions |
| Refuse and Cancel accept the pending second-approval state | PASS | Workflow/API guard inspection and regression suite |
| Manager permission boundary | PASS | Action declarations require `time_off.manage` |
| Migration replay | PASS | Migration rerun and version assertion |
| File-backed restart | PASS | Approval-audit close/reopen case |
| Authenticated desktop/mobile visual comparison | BLOCKED | Live reference has no Time Off action; no visual claim |
