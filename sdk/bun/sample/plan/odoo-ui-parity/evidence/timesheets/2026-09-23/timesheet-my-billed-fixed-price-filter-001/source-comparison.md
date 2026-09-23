# Source comparison

Odoo 19 source at `/home/nhanjs/projects/odoo` revision `65975996`:

- `addons/sale_timesheet/views/hr_timesheet_views.xml:12-14` declares
  `billable_fixed` with domain
  `timesheet_invoice_type = billable_fixed` and restricts it to
  `sales_team.group_sale_salesman`.
- `addons/hr_timesheet/views/hr_timesheet_views.xml:270-283` makes
  `hr_timesheet_line_my_timesheet_search` the primary My Timesheets search view.
- BrowserSkill observation of the authenticated Odoo My Timesheets page showed
  the filter in the Filters menu; applying it produced a checked filter chip.

Core3 now declares the same visible label/value in the layout-only My
Timesheets page. The durable entries query and total-footer query both apply
the `billing_type` parameter, preserving actor and company scope. The API
projection and filter contract remain in the API fragment rather than the page
manifest.
