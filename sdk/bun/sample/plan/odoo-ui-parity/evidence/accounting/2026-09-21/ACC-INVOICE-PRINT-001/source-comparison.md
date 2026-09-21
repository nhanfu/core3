# Source comparison

## Odoo 19 local source

- Form action: `/home/nhanjs/projects/odoo/addons/account/views/account_move_views.xml`
  declares `action_print_pdf` as `Print` for posted customer invoices and
  customer credit notes.
- Server action: `/home/nhanjs/projects/odoo/addons/account/models/account_move.py`
  method `action_print_pdf` resolves the default PDF report and calls
  `report_action`.
- Report resolution:
  `/home/nhanjs/projects/odoo/addons/account/models/account_move_send.py`
  falls back to `account.account_invoices`.
- Report definition:
  `/home/nhanjs/projects/odoo/addons/account/views/account_report.xml`;
  name `Invoice PDF`, model `account.move`, QWeb template
  `account.report_invoice_with_payments`, output `qweb-pdf`.
- Filename behavior: Odoo replaces `/` in the invoice name with `_` and adds
  `.pdf`.

## Core3 bounded implementation

- Page: `services/accounting/pages/invoice-detail.yaml`, page ID
  `invoice-detail`, visible `Print` header action for posted customer invoice
  or customer credit note.
- API: `services/accounting/api/invoice-detail.yaml`, matching page ID and
  `accounting_invoice_print_runs` history datasource.
- Action: `print_accounting_invoice`, action permission `accounting.read`,
  `accounting.invoices.print`, expected-row-version concurrency, actor/state/
  type guards, and durable history refresh.
- Migration:
  `services/accounting/migrations/20260921130000-050-accounting-invoice-print.yaml`.
- Test: `test/accounting_invoice_print.integration.test.ts`.

The Core3 report identity is intentionally source-backed while the mutation
stores a report-run record rather than pretending to produce Odoo's PDF bytes.
