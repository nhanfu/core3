# Menu and action inventory

| Odoo entry | Source action/model | Core3 surface | Boundary |
| --- | --- | --- | --- |
| Recruitment → Applications → All Applications | `crm_case_categ0_act_job` / `hr.applicant` list, kanban | `/applicants` | `recruitment.read` |
| Applicant list/kanban contextual action | `mail_followers_edit_action_from_hr_recruitment` / `mail.followers.edit` | Bulk `Add/Remove Followers` server form | `recruitment.write` |
| Applicant detail follower state | `mail.followers` chatter/followers | Read-only Followers group in `/applicants/detail` | `recruitment.read` |

The Core3 route is a deliberate route alias; the YAML page and API fragment
remain joined by `page.id=applicants`. Recruitment owns the bounded durable
contact/subscription/audit adaptation; it does not claim full Mail chatter,
partner directory, or outbound email delivery parity.
