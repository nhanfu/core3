# Verification

- The invoice detail datasource now returns `payment_state`.
- Migration initialization derives `paid` from `state = 'Paid'` or zero
  residual and `not_paid` for active draft/posted non-journal invoices.
- `accounting.write` is required by the action; a read-only actor receives
  HTTP 403 before mutation execution.
- Missing invoices return `ACCOUNTING_INVOICE_PAYMENT_BLOCK_NOT_FOUND`.
- Cancelled/journal/stale rows return
  `ACCOUNTING_INVOICE_PAYMENT_BLOCK_UNAVAILABLE`.
- Paid and in-payment rows are rejected without changing state or version.
- A current invoice toggles `not_paid` → `blocked` → `not_paid`, increments
  `row_version` each time, and retains the result after DuckDB close/reopen.

Remaining gap: payment registration and provider settlement do not yet share a
complete Odoo payment-state lifecycle with this bounded payment block field.
