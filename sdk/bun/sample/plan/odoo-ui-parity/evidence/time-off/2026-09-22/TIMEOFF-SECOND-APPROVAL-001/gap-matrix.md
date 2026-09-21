# Gap matrix

| Gap | Owned paths | Change | Verification |
| --- | --- | --- | --- |
| No second-approval state | `pages/time-off-workflow.yaml`, request/approval pages | Added `Second Approval` state and guarded transitions | Focused declaration/workflow cases |
| No leave-type two-step contract | `migrations/20260922150000-024-second-approval.yaml` | Added idempotent validation-type mapping; seeded Training Time Off as `both` | Migration replay and workflow setup |
| No approver audit | Same migration | Added durable first/second approver table and index | File restart case |
| No first/final actions | request, approval, overview API/page YAML | Added Approve and Validate actions with manager permission | Action contract assertions |
| Existing named-action conflict blocked runtime | `api/time-off-overview-detail.yaml` | Kept overview refusal as a distinct order-transition action name | Full Time Off discovery regression |
| No paired visual proof | Live environment | Not fabricated; blocker recorded | Verification ledger |
