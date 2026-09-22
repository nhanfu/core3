# Odoo analysis

- Source revision: `659759969d535d286b656c96b675e4612b925ddd`.
- Addon: `/home/nhanjs/projects/odoo/addons/hr_recruitment`.
- Wizard model: `job.add.applicants`.
- Wizard view: `wizard/job_add_applicants_views.xml`.
- Applicant action: `models/hr_applicant.py::action_job_add_applicants`.
- List/form view binding: `views/hr_applicant_views.xml`.

Odoo's transient form has required `applicant_ids` and `job_ids`; the visible
field is the many-to-many Job Positions selector with placeholder `Move to...`.
The primary button is `Create Applications`; the secondary button is `Discard`.
`_add_applicants_to_job` copies every selected applicant for every selected job,
clears talent-pool membership, chooses the first non-folded stage for that job,
and preserves the applicant profile. One created application opens its form;
multiple creations return a success notification and close the wizard.

The applicant list binds `action_job_add_applicants` as `Create Applications`.
The applicant form shows the same button only when `is_pool_applicant` is true.
Model access grants the Recruitment User group create/write/create/delete on
the transient wizard; Core3 maps the talent-pool surface to its existing
manager-equivalent `recruitment.manage` permission and keeps the detail action
on `recruitment.write`.
