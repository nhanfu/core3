# Source comparison

Local Odoo 19 source: `/home/nhanjs/projects/odoo/addons/hr_recruitment`

| Contract | Odoo 19 source | Core3 implementation | Result |
| --- | --- | --- | --- |
| Menu | `views/menuitems.xml`: Activities → Activity Types, sequence 10 | `services/recruitment/manifest.yaml`: `/recruitment/activity-types` under Configuration | implemented with deliberate Core3 route alias |
| Action | `mail_activity_type_action_config_hr_applicant` | API/page action ids prefixed `recruitment_activity_type` | implemented |
| Model/domain | `mail.activity.type`; generic or `hr.applicant`; default `hr.applicant` | `recruitment_activity_types`; query limits rows to NULL or `hr.applicant`; create defaults to `hr.applicant` | implemented |
| View modes | `list,kanban,form` | List/Kanban tabs and row form actions | implemented |
| List | Sequence, Name, Default Summary, Planned in, Type, optional next fields | Sequence, Name, Default Summary, Planned in, Type, Model, Status | implemented for bounded slice |
| Form | Activity settings, default user, summary, schedule, delay type, chaining, note | Same bounded settings plus deterministic text fields for responsible and next-activity values | implemented |
| Permissions | Base users read; system users CRUD | `recruitment.read` datasource; `recruitment.manage` mutations | deliberate Core3 permission mapping |
| State/data | Active/archive semantics; source has no Recruitment-specific fixture guarantee | Durable active state, fixed fixtures, archive/restore, row-version guards, in-use delete guard | implemented |

The live reference could not be compared visually because the authenticated
`core3_reference` session did not expose Recruitment and the direct Recruitment
route returned Discuss. No source claim is inferred from that missing surface;
the implementation is based on the local Odoo source contract above.
