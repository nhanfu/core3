# Odoo analysis

- Addon/version: local Odoo 19 Community `hr`.
- Model source: `/home/nhanjs/projects/odoo/addons/hr/models/hr_employee.py`.
- View source: `/home/nhanjs/projects/odoo/addons/hr/views/hr_employee_views.xml`.
- Odoo defines `newly_hired` as computed/searchable and calculates the search
  set from `create_date` in the last 90 days.
- The Employees search view declares `filter name="newly_hired" string="Newly
  Hired"`.
- Authenticated live action: `http://localhost:8069/odoo/employees`, database
  `core3_reference` as requested; selecting the filter returned 8 records.
