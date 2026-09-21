# Source comparison

Local Odoo 19 source: `/home/nhanjs/projects/odoo/addons/hr_recruitment`

| Contract | Odoo 19 source | Core3 implementation | Result |
| --- | --- | --- | --- |
| Menu | `views/menuitems.xml`: Activities → Activity Plans, sequence 20, manager group | `services/recruitment/manifest.yaml`: `/recruitment/activity-plans` under Configuration | implemented with deliberate Core3 route alias |
| Action | `mail_activity_plan_action_config_hr_applicant` | `api/activity-plans.yaml` action ids prefixed `recruitment_activity_plan` | implemented |
| Model/domain | `mail.activity.plan`; `res_model = hr.applicant`; default model context | `recruitment_activity_plans`; fixed model default and guards | implemented |
| View modes | `list,kanban,form` | List/Kanban tabs and row form actions | implemented |
| List/kanban | Plan name, applies-to model, steps count, company; mobile kanban | Name, Applicants, Activities, Company, status plus Odoo-style kanban card | implemented for bounded slice |
| Form/templates | Plan Name, fixed model, company, Activities To Create rows with activity type, summary, assignment, delays, and next activities | Server form persists ordered step rows as validated `steps_json`; step count is queried from durable data | implemented via YAML-compatible persistence adapter |
| Permissions | Recruitment manager full CRUD on plan and plan-template models; ordinary users do not get this menu | Datasource and all mutations require `recruitment.manage` | deliberate Core3 permission mapping |
| State/data | `active` supports archived plans; source action is scoped to applicant plans | Deterministic active/archived fixtures, archive/restore, row-version guards, restart proof | implemented |

The authenticated live reference was unavailable for this feature: its launcher
did not expose Recruitment and direct navigation returned the Discuss shell. No
visual claim is inferred from that absence; the implementation is source-backed
by the local Odoo 19 addon and remains visually blocked pending a reference
session that exposes Recruitment.
