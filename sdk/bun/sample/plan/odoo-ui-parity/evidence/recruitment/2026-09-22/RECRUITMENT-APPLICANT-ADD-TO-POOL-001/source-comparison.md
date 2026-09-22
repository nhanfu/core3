# Source comparison

Odoo 19 source revision: `659759969d535d286b656c96b675e4612b925ddd`.

| Odoo source contract | Core3 bounded mapping |
| --- | --- |
| `hr_applicant.py:846-862` opens the `talent.pool.add.applicants` modal with selected applicants and optional default pools | Applicant list/kanban bulk action and applicant-detail server form expose the same Add to Pool workflow through YAML actions |
| `talent_pool_add_applicants.py:7-20` accepts applicants, talent pools, and tags | `pool_ids` and optional `tag_ids` multi-select fields use active pool/tag option datasources |
| `talent_pool_add_applicants.py:23-49` links existing talent records, or copies a normal applicant into a no-job pool profile and links both records | Existing pool members receive idempotent memberships; normal applicants receive a deterministic durable pool profile, source link, memberships, and optional tags |
| `hr_applicant_views.xml:92-99` shows Add to Pool on a non-pool applicant form | Applicant detail header action is visible only for active records with no pool membership |
| `hr_applicant_views.xml:374-383` binds the pool action to the kanban context | Applicants page exposes the source-backed action as a selectable list/kanban bulk action |

The bounded adaptation keeps the repository's required applicant opening fields
and marks new copied rows with `is_pool_profile`; it does not rebuild the
applicant table beneath dependent relations. External mail/chatter delivery
and full Odoo many2many category rendering remain outside this slice.
