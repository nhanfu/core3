# Source comparison

| Feature | Odoo 19 | Core3 before slice | Classification |
| --- | --- | --- | --- |
| Work Center Overview Late link | `action_work_order` plus `search_default_late` | Overview exposed Work Orders, Waiting Availability, OEE only | missing |
| Selected-center late work orders | `action_work_orders`, selected center, non-terminal domain | Generic scoped route had optional late filter but no Late entry route/default | partial |
| View modes | List/Form/Pivot/Graph/Calendar | Adjacent Work Center routes already support the renderer modes | partial |
| Workflow/permissions | Existing work-order actions, write guard, no create/delete from action | Existing durable `mrp_workorders` workflow and permission contracts | implemented/reuse |
| Persistence | ORM work orders and source late/date predicate | Durable `mrp_workorders.late`, existing fixtures/index | partial |
