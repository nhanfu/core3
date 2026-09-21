# Source comparison

| Odoo source | Core3 contract | Evidence |
| --- | --- | --- |
| `hr_version.py`: `contract_date_start` and `contract_date_end` Date fields in the active version | Employee `contract_start`/`contract_end` projection plus active `employee_versions.contract_date_start`/`contract_date_end` persistence | Focused source-mapping and restart tests |
| `hr_employee_views.xml`: Payroll Contract row renders Start Date and End Date | Employee-detail Payroll Contract Dates group and `edit_employee_contract_period` API action | Authenticated Odoo desktop/mobile captures show the compact Contract date range |
| Odoo HR-manager field boundary and date ordering | `employees.manage`, actor, active/current-company employee, active Payroll version, ISO-date, ordering, and stale row-version guards | Focused guard test |

The existing broad employee editor exposed employee-level dates but did not
provide the active Payroll-version synchronization or manager-scoped contract
date action. Contract Type remains a separate completed slice.
