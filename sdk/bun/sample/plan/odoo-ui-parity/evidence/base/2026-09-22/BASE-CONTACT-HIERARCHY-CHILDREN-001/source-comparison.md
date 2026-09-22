# Source comparison

| Concern | Odoo 19 | Core3 implementation |
| --- | --- | --- |
| Relation | `res.partner.child_ids` is a one-to-many relation from a partner to active child contacts | `contact_child_contacts` queries active `base_contacts` rows by `parent_company_id` |
| Detail UI | Contacts notebook tab contains a child kanban and inline Contact / Address form | `pages/contact-detail.yaml` mounts a shared `LineItemGrid` in the Contacts content slot; API actions live in `api/contact-detail.yaml` |
| Create | Context defaults the selected partner as `parent_id` and inherits address/company context | `add_contact_child` derives parent/company fields, uses deterministic child IDs, and increments the parent row version atomically |
| Edit/delete | Inline child form supports updating and removing child contacts | `edit_contact_child` and `delete_contact_child` require child and parent row versions and current-company scope |
| Failure boundaries | Odoo relation is limited to the current partner record and active child domain | Required-name, duplicate-ID/email, missing, cross-company, inactive-parent, and stale parent/child guards return stable errors |

No Odoo frontend code was copied.
