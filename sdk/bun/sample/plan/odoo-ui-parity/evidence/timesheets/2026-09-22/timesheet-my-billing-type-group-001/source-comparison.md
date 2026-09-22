# Source comparison

Local Odoo source `addons/sale_timesheet/views/hr_timesheet_views.xml` adds a
`Billing Type` Group By filter using `timesheet_invoice_type` to the internal
timesheet search view. The live `My Timesheets` action showed the same option
under Group By and accepted the selection.

Core3 implements the bounded behavior in:

- `services/timesheets/pages/entries.yaml`: shared group control option.
- `services/timesheets/api/entries.yaml`: pivot field, group contract, and
  durable query projection.

The contracts are separate and joined by `page.id: timesheets`. The existing
0.0.5 migration already persists `billing_type`; no duplicate migration was
needed.
