# Source comparison

| Odoo behavior | Existing Core3 state | Classification | Change |
| --- | --- | --- | --- |
| Work Center dashboard link opens `action_work_orders` with selected center and Waiting filter | Overview declared `open_mrp_workcenter_waiting` but navigated global `/workorders` and had no dedicated scoped contract | partial | Add dedicated page/API route and update navigation params |
| Action modes `list,form,pivot,graph,calendar` | Existing scoped Work Orders contract already had these modes | implemented/reused | Keep the same visible tab contract |
| Domain excludes terminal rows and Waiting context selects waiting rows | Existing scoped query excluded terminal rows but did not force Waiting state | partial | Add `w.state = 'Waiting'` and selected-center predicates |
| Waiting operator can plan | Existing durable `mrp_workorders` workflow supports plan | implemented/reused | Expose only the Plan action on this state-specific page |
| No create/delete from dashboard action | Existing scoped contract had no create/delete | implemented/reused | Preserve boundary |
| Durable records and state changes | Existing `mrp_workorders` table and migration 021 | implemented/reused | Query existing rows; restart test proves persistence |
| Authenticated visual source | Shared profile redirects to Discuss/OdooBot | blocked | Record exact blocker; no visual parity claim |
