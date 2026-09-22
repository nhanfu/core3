# Source comparison

The local Odoo 19 source defines `action_hr_job_new_application` in
`/home/nhanjs/projects/odoo/addons/hr_recruitment/views/hr_job_views.xml` as
an `ir.actions.act_window` for `hr.applicant`, with `view_mode=form` and
context values `default_job_id` and `search_default_job_id` from `active_id`.
The applicant form in `hr_applicant_views.xml` requires the applicant name and
exposes email, phone, priority, job, recruiter, and sourcing information.

Previous Core3 had a global applicant create form, but job-position rows
navigated to an unregistered `/openings/detail` route and had no job-scoped
creation action. This batch adds a registered detail page plus a page-local
API fragment joined by `page.id`. The action carries the detail row's opening
ID, name, and expected row version, validates the active current-company
opening and signed-in actor, then inserts one durable applicant with fixed
date and deterministic action-derived ID.

| Odoo contract | Core3 implementation | Deliberate boundary |
| --- | --- | --- |
| `form` action with active job context | `create_recruitment_application_from_opening`, hidden opening context, detail row version | Existing YAML server-form primitive |
| Applicant/contact/source fields | Name, email, phone, source, recruiter, rating, priority, notes | Partner many2one and chatter are outside this action |
| Company/access enforcement | Opening company guard, actor guard, `recruitment.write` permission | Odoo groups map to Core3 module permissions |
| Durable create | Existing `recruitment_applicants` table, opening counter, fixed timestamps, restart test | No email, follower, or external delivery is triggered |
