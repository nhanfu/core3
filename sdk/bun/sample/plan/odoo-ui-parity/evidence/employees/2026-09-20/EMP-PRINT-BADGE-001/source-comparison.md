# Source comparison

| Concern | Odoo source | Core3 implementation |
| --- | --- | --- |
| Report binding | `addons/hr/report/hr_employee_badge.xml:3-13` declares `hr_employee_print_badge`, model `hr.employee`, `qweb-pdf`, and `Badge - %s` filename. | `services/employees/api/employee-badge.yaml` exposes `employees.records.print_badge`; the employee detail client action records the run and navigates to `/employees/badge`. |
| Printed content | `hr_employee_badge.xml:19-51` prints employee image/company logo, name, job, and barcode widget. | `pages/employee-badge.yaml` renders employee, job, company, badge ID, report status, and durable print history through shared YAML components. |
| Form action | `hr_employee_views.xml:406` binds conditional Print Badge to the employee Settings Badge ID field. | `pages/employee-detail.yaml` shows Print Badge only for an active employee with a barcode and `employees.read`; API action remains separate from page layout. |
| Preconditions | Odoo button is invisible when no barcode exists; the report is bound to an employee record. | Server mutation requires actor, company, barcode, row version, actor identity, and company identity; invalid requests create no history row. |
| Durable behavior | Odoo renders a report but does not expose a report-run history model in this view. | Migration `20260920210000-032-employee-badge-report.yaml` creates idempotent `employee_badge_print_runs` history and an employee index; restart tests prove retention. |
