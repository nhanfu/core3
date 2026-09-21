# Gap matrix

| ID | Gap | Implementation | Test/evidence |
| --- | --- | --- | --- |
| WCWO-001 | Missing record-scoped page/API contract | Added matching page ID `manufacturing-work-center-workorders` and API fragment | Page/API ownership test |
| WCWO-002 | Global action did not enforce source terminal domain | Scoped SQL excludes Finished/Cancelled | Terminal filter assertion |
| WCWO-003 | Overview navigation opened generic Work Orders | Binding now passes `workcenter_id` and `workcenter` to the scoped route | Overview regression assertion |
| WCWO-004 | Scoped lookup lacked a durable query index | Migration 021 adds idempotent `(workcenter,state,planned_date,sequence)` index | Migration replay and file assertion |
| WCWO-005 | Reference visual state unavailable | Shared profile redirects to Discuss/OdooBot | Desktop/mobile blocker screenshots |
