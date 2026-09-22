# Odoo analysis

Source revision: `659759969d535d286b656c96b675e4612b925ddd`

Files inspected:

- `/home/nhanjs/projects/odoo/addons/hr_recruitment/views/hr_job_views.xml`
- `/home/nhanjs/projects/odoo/addons/hr_recruitment/views/menuitems.xml`
- `/home/nhanjs/projects/odoo/addons/hr_recruitment/security/hr_recruitment_security.xml`
- `/home/nhanjs/projects/odoo/addons/hr_recruitment/security/ir.model.access.csv`

`action_hr_job_interviewer` targets `hr.job`, declares `kanban,form`, sets
`{'create': False}`, and filters jobs through `interviewer_ids` or
`extended_interviewer_ids` containing the current user. The interviewer access
row is read-only for `hr.job`; the ordinary recruitment-user action is a
separate full Job Positions action.

The live action was not opened because the required authenticated tab was
already borrowed by another BrowserSkill team session. This document records
source truth only, not a visual comparison.
