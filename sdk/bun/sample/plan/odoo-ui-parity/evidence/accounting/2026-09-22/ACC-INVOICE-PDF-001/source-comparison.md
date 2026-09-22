# Source comparison

## Local Odoo 19

- `/home/nhanjs/projects/odoo/addons/account/views/account_move_views.xml`
  exposes `action_print_pdf` as `Print` for posted customer invoices and
  customer credit notes, excluding vendor bills and refunds.
- `/home/nhanjs/projects/odoo/addons/account/models/account_move.py`
  resolves the default invoice report and returns its report action.
- The report is `account.account_invoices`, named `Invoice PDF`, uses
  `account.report_invoice_with_payments`, and returns PDF output through
  Odoo's report download route.
- Odoo derives the filename by replacing `/` in the invoice name with `_` and
  adding `.pdf`.

## Core3

- `services/accounting/pages/invoice-detail.yaml` exposes `Print` only for
  posted customer invoices and customer credit notes.
- `services/accounting/api/invoice-detail.yaml` owns the matched
  `accounting_invoice_pdf` datasource and the
  `download_accounting_invoice_pdf` client action.
- `services/accounting/storage.yaml` maps the Accounting PDF storage route to
  the same permissioned datasource and returns `application/pdf` bytes.
- `services/accounting/migrations/20260922110000-051-accounting-invoice-pdf.yaml`
  persists deterministic artifact content on the invoice record.

The report identity and eligibility match Odoo. The renderer remains a
bounded deterministic artifact rather than a full QWeb/report-engine clone.
