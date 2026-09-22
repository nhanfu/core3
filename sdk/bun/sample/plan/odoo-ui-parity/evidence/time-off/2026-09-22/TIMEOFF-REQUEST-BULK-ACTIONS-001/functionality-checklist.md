# Functionality checklist

| ID | Check | Result |
| --- | --- | --- |
| BULK-001 | All Time Off page/API retain the same `page.id` | pass |
| BULK-002 | List is selectable and exposes Approve/Refuse labels | pass |
| BULK-003 | Both actions require `time_off.manage` | pass |
| BULK-004 | Ordinary submitted approval becomes Approved and consumes balance | pass |
| BULK-005 | Two-step submitted approval becomes Second Approval without balance use | pass |
| BULK-006 | Second approval becomes Approved and consumes balance | pass |
| BULK-007 | Refusal persists state, actor, reason, and row version | pass |
| BULK-008 | Invalid selection, non-pending state, and insufficient balance are guarded | pass |
