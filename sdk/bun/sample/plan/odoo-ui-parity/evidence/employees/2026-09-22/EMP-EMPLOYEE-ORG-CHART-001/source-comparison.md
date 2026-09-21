# EMP-EMPLOYEE-ORG-CHART-001 source comparison

Date: 2026-09-22

## Odoo source

- Model: `hr.employee.parent_id` (`Manager`) and `hr.employee.child_ids` (`Direct subordinates`) at `/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py:193-195`.
- Employee form: Work tab and `o_employee_org_chart` mount at `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml:155-183`.
- Employees menu/action: `menu_hr_employee_payroll` -> `open_view_employee_list_my`; action path `employees`, modes `kanban,list,form,activity,graph,pivot`, at `hr_employee_views.xml:663-667` and `hr_views.xml:17-23`.

## Core3 implementation

- Page: `services/employees/pages/employee-detail.yaml`, `page.id: employee-detail`, Work-tab `LineItemGrid` source `employee_org_chart`.
- API: `services/employees/api/employee-detail.yaml`, same `page.id`; read datasource and `view_employee_org_report` navigation action.
- Migration: `services/employees/migrations/20260923030000-093-employee-org-chart.yaml`.
- Focused test: `test/employees_org_chart.integration.test.ts`.

The projection is active and company-scoped, returns direct reports from the
durable manager relation with the legacy organization-parent fallback, and
uses a shared grid rather than an Employees-specific renderer.
