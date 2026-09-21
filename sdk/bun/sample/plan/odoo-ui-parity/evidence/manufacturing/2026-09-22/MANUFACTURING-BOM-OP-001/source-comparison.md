# Source comparison

| Odoo contract | Core3 implementation | Classification |
| --- | --- | --- |
| BoM `Operations / Performance` stat button | `bom_operations_performance` in `pages/bom-detail.yaml` and `api/bom-detail.yaml` | implemented |
| `mrp.action_mrp_routing_time`, scoped to active BoM and `done` work orders | `api/bom-operations-performance.yaml` query by `bom_id` and `state = Finished` | implemented; Core3's durable report state label is `Finished` |
| `graph,pivot,list,form,calendar` | `pages/bom-operations-performance.yaml` visible tabs in source order | implemented |
| Work-order form mode | Reuses existing read-only Work Order Performance detail page | implemented without duplicate detail contract |
| Durable Odoo operation-to-BoM relation | `bom_id` on persisted analysis rows plus index migration `0.0.22` | implemented |
| Authenticated live-reference visual state | Odoo shared profile redirects to Discuss and hides Manufacturing | blocked |
