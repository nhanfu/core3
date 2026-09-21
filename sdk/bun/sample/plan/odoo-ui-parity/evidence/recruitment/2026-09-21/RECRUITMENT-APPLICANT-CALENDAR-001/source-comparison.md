# Recruitment applicant Calendar — source comparison

Owned slice: `RECRUITMENT-APPLICANT-CALENDAR-001`

Reference source: `/home/nhanjs/projects/odoo`, Odoo 19 checkout.

| Contract | Odoo 19 source | Core3 contract |
| --- | --- | --- |
| Menu/action | `views/menuitems.xml`: Recruitment → Applications → All Applications, action `crm_case_categ0_act_job` | Existing `/applicants` page, page id `applicants` |
| Action view mode | `views/hr_applicant_views.xml:518-525`: `kanban,list,form,pivot,graph,calendar,activity` | Existing applicant list/kanban/activity plus the new Calendar tab |
| Calendar definition | `views/hr_applicant_views.xml:329-350`: month mode, `date_start="activity_date_deadline"`, `color="user_id"`, `event_limit="5"`, `hide_time="true"`, `quick_create="0"` | `pages/applicants.yaml:28-36`: desktop-only month Calendar, `date_field: activity_date_deadline`, applicant/job/activity card |
| Event content | Applicant, Job Position, Priority, responsible user, Activity Summary | Applicant (`name`), Job Position (`opening_name`), Priority, Activity Summary, Recruiter |
| Access | `security/hr_recruitment_security.xml:49-67`: interviewer domain and recruitment-user all-applicant rule | `recruitment.read` datasource/page access plus existing company-scope filtering |
| Persistence | Odoo activity deadline is a stored applicant activity field | `migrations/20260912120000-012-recruitment-applicant-activities.yaml` stores deterministic deadline/summary/user data; restart test proves it survives reload |

The Core3 page/API split remains intact: the page only declares the Calendar
presentation, while `api/applicants.yaml` owns the read datasource and its
permission/error/workflow metadata. Applicants without a stored
`activity_date_deadline` are naturally absent from the Calendar event set.
