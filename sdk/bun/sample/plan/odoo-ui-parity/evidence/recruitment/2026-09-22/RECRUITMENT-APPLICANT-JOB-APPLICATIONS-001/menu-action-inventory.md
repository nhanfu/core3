# Menu and action inventory

| Odoo surface | Odoo source/action | Core3 surface | Result |
| --- | --- | --- | --- |
| Recruitment → Applications → By Talent Pools → Talents | `hr.applicant.action_job_add_applicants`; list header | `/recruitment/talent-pools/talents`, page `recruitment-talent-pool-talents` | Implemented as selectable bulk action |
| Pool applicant form header | `hr.applicant.action_job_add_applicants`; `invisible="not is_pool_applicant"` | `/applicants/detail`, page `applicant-detail` | Implemented with `is_pool_applicant` guard |
| Wizard form | `job_add_applicants_view_form` | YAML `server_form` in `api/talent-pool-talents.yaml` and `api/applicant-detail.yaml` | Implemented |

The source action is linked from an applicant context rather than a new
top-level menu, so no new manifest menu item was added.
