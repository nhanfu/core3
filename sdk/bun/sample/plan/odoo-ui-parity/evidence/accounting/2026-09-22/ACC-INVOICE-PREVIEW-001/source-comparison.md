# Source comparison

| Odoo behavior | Core3 implementation | Result |
| --- | --- | --- |
| `preview_invoice` returns a portal URL for the current posted customer document | `preview_accounting_invoice` is a page/API-bound `navigate` action to `/accounting/invoice-preview` | implemented |
| Button is available only for posted customer invoices/credit notes | `invoice-detail.yaml` `show_if` plus preview datasource `state = 'Posted'` and invoice type guard | implemented |
| Portal page shows invoice, total, payment state, Download and Back to edit mode | `invoice-preview.yaml` renders a read-only OdooFormView with persisted invoice values, banner, Back and reused PDF Download | bounded implementation |
| External portal URL, public access token, Pay Now provider flow and portal chatter | Not added; Core3 has no equivalent external portal/payment-provider contract in this slice | explicit follow-up |
