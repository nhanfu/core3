# EXPENSE-FUNC-019 - same-receipt expense drilldown

This slice implements Odoo's `hr.expense.action_show_same_receipt_expense_ids`.
The detail form exposes a permissioned View same receipt action when another
expense in the current company has the same receipt checksum. It opens a
page-ID-bound read-only list with list and kanban modes and row navigation back
to the shared expense detail page.

The implementation uses existing `expenses.receipt_checksum` data and adds one
idempotent deterministic demo pair. No attachment binary or credential data is
committed.

BrowserSkill was connected on browser instance `245ea108`. Borrowing the
existing user tab did not complete: a subsequent command reported
`previous session command is still running`, and cleanup reported
`session is not registered`. The session was stopped afterward; no credentials,
cookies, tokens, DOM, or screenshots were read, and no visual-parity claim is
made.
