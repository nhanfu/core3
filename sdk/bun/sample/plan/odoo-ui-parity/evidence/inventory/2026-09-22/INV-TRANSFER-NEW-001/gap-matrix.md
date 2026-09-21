# Gap matrix

| Surface | Status | Exact gap/blocker |
| --- | --- | --- |
| Core3 durable New Transfer contract | PASS | Focused suite covers create, guards, permissions, and restart. |
| Core3 authenticated visual desktop/mobile | BLOCKED | Module runner and audit stop during global page discovery on an unrelated graph `category_field` and activity `title_field`/`activity_types` schema error. |
| Odoo authenticated Inventory Overview | PASS / observed | Overview rendered at desktop and emulated 390x844. |
| Odoo New Transfer form | BLOCKED | Overview New did not open; generated action route and Operations Types route showed generic Odoo error modal. |
| Product lines / stock reservation | OUT OF SCOPE | Requires a distinct move-line and inventory workflow slice. |
| Note/chatter persistence | OUT OF SCOPE | Existing `inventory_pickings` contract has no note field; not claimed by this slice. |

No visual parity sign-off is made while the Core3 and live Odoo target surfaces
are unavailable.
