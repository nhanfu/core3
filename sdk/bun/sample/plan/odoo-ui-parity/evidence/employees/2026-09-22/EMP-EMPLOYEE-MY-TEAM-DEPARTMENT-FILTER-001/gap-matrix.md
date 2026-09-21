# Gap matrix

| Gap | Before | Change | Evidence |
| --- | --- | --- | --- |
| My Team filter absent | Employees page had no current-user team filter | Added page option and SQL projection/filter | focused integration test |
| My Department filter absent | Employees page had no current-user department filter | Added page option and SQL projection/filter | focused integration test |
| Scope lookup | No index for repeated authenticated scope lookups | Added idempotent `employees_scope_filter_idx` migration | restart assertion |
| Live visual comparison | No task-owned access to authenticated reference tab | Recorded exact bsk ownership blocker; no visual claim | `verification.md` |

Out of scope: manager-only In Contract/Out of Contract filters, which require a
separate permission-aware filter contract and are not duplicated here.
