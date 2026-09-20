# Source comparison

| Surface | Odoo source | Core3 contract |
| --- | --- | --- |
| Employee relation | `addons/hr/models/hr_version.py`: `work_location_id = fields.Many2one('hr.work.location', 'Work Location')` | `employees.work_location_id` plus the existing display name on `employees` |
| Employee form | `addons/hr/views/hr_employee_views.xml`: Work > Location renders `work_location_id` with the employee address context | `employee-detail` Work > Location projection and `edit_employee_work_location` action |
| Address/company boundary | Odoo selects a work location for the employee address and company | Core3 requires an active location matching the employee address and current company |
| Configuration | Odoo Work Locations is a separate catalog | Existing Core3 Work Locations CRUD remains unchanged; this slice adds assignment only |
