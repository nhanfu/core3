# Source comparison

## Odoo 19

- Addon: `hr`, Odoo 19 Community.
- Menu/action: Employees > Human Resources > Employees,
  `open_view_employee_list_my`.
- Source view: `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml`.
- Graph: `New Employees Over Time`; `contract_date_start` interval month;
  employee `id` measure.
- Pivot: `job_id` rows; `contract_date_start` interval year columns; employee
  `id` measure.

## Core3 before this slice

`services/employees/pages/employees.yaml` used `hire_date` for Graph/Pivot
and `activity_count` as the measure. That counted chatter/activity state,
not employees represented by the Odoo action.

## Core3 after this slice

- Page contract remains `page.id: employees`.
- API query remains in `services/employees/api/employees.yaml`.
- The durable employee query exposes `contract_start` and `employee_count = 1`.
- Graph binds to `contract_start` with the Odoo employee measure label
  `Employees`; the Odoo graph title is recorded in the source comparison while
  the shared Core3 view contract supplies the Graph tab label.
- Pivot groups `job_title` rows, `contract_start` year columns, and sums
  `employee_count`.
- Migration `20260923050000-095-employee-analysis-contract-start.yaml` adds
  the company/active/contract-start/job lookup index.
