# Source comparison

## Local Odoo 19 source

- `addons/hr/static/src/components/button_new_contract/button_new_contract.js`: saves the form, calls `hr.version.check_contract_finished`, opens a date picker, checks `hr.employee.check_no_existing_contract`, then calls `hr.employee.create_contract` and reloads the selected version.
- `addons/hr/static/src/components/button_new_contract/button_new_contract.xml`: renders the `New Contract` control.
- `addons/hr/models/hr_employee.py`: rejects an employee already in contract on the selected date and creates or updates a durable `hr.version`, copying the selected version and ending it the day before a later contract.
- `addons/hr/models/hr_version.py`: rejects an unfinished current contract and validates non-overlapping contract dates.
- `addons/hr/views/hr_employee_views.xml`: places the widget in the Employee Payroll view.

## Live reference observations

Authenticated Odoo desktop and mobile views both expose `New Contract` in Payroll. The control opens a date picker; the Payroll view shows Contract Overview, `Load a Template`, contract dates, `New Contract`, Wage, Employee Type, Contract Type, Pay Category, and Working Hours. See the four PNG captures in this directory. The desktop picker capture is 1916x833 from the browser screenshot tool; the explicit desktop Payroll capture is 1440x900; mobile captures are 390x844.

## Core3 mapping

`pages/employee-detail.yaml` owns the `New Contract` presentation action and `api/employee-detail.yaml` owns the `server_form` action; both retain `page.id: employee-detail`. Migration `20260922350000-089-employee-new-contract.yaml` adds a replay-safe unique `(employee_id, date_version)` invariant. The action copies the active Payroll version into `employee_versions`, supports a same-date uncontracted version update, increments the employee row version, and returns the durable version.

The bounded UI difference is intentional and documented: Core3 uses its existing server-form date control, while the Odoo widget opens an inline date picker. The state and permission semantics remain guarded by `employees.manage`.
