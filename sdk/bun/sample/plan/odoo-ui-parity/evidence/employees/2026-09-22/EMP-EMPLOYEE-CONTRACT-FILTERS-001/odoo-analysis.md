# Odoo analysis

`/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml` defines
`In Contract` and `Out of Contract` filters, both restricted to
`hr.group_hr_manager`. In Contract requires start <= today and (no end or end
>= today). Out of Contract matches no start, future start, or end < today.
`hr_version.py` supplies the related Payroll contract dates and
`_is_in_contract` semantics.

The live comparison was attempted through BrowserSkill on Chrome instance
`245ea108`. Authenticated tab `1770662590` was already borrowed by session
`nhqc`; a task-owned borrow produced no usable observable tab. No credentials,
cookies, or tokens were accessed.
