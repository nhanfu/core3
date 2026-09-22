# Source comparison

| Contract | Odoo 19 source/reference | Core3 |
| --- | --- | --- |
| Group label | `sale_timesheet/views/hr_timesheet_views.xml`: `Invoice` | `invoice_name`, label `Invoice` |
| Stable source relation | `context="{'group_by': 'timesheet_invoice_id'}"` | `timesheet_entries.invoice_id` with `invoice_name` display value |
| Visibility | `sales_team.group_sale_salesman` on the inherited search view | Existing authenticated `timesheets.read` My Timesheets surface; no new permission widening |
| Scope | My Timesheets action at `/odoo/timesheets` | `/timesheets`, current employee and company constrained |
| Persistence | Odoo invoice relation | Idempotent migration `0.0.32`, fixed invoice fixtures, indexed relation |

The live Odoo action showed Invoice in the Group By menu. Core3 does not claim
the unrelated invoice form/stat-button workflow; this slice covers only the
missing My Timesheets grouping behavior.
