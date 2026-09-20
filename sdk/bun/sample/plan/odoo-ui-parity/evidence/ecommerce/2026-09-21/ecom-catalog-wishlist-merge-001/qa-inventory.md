# QA inventory

| Claim/control | Functional check | Visual state/evidence |
| --- | --- | --- |
| Odoo login merge mapping | Source assertions cover duplicate unlink, reassignment, session pop, and login hook | Source comparison document |
| Company/customer permission | Wrong-company and customer-company guards are exercised | Authenticated actor capture blocked by unavailable Core3 runtime |
| Optimistic concurrency | Wrong source row version returns 409 with no mutation | Merge conflict state is service-tested; browser blocked |
| Duplicate suppression | Pre-existing customer Mug remains one row while Lamp transfers | Customer wishlist post-merge state; browser blocked |
| Idempotency | Replaying after source deletion leaves target count/version unchanged | Retry state is service-tested; auth listener remains open |
| Restart durability | DuckDB close/reopen preserves target and consumed source | Restart assertion in focused test |

No full Ecommerce sign-off is claimed. Shared auth wiring and paired rendered
Odoo comparison remain open.
