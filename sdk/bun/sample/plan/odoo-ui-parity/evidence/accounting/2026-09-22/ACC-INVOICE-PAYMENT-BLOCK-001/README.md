# ACC-INVOICE-PAYMENT-BLOCK-001

Bounded Accounting parity evidence for Odoo's `(Un)Block Payment` form action.

- Odoo source: `addons/account/views/account_move_views.xml` and `addons/account/models/account_move.py`.
- Core3 route: `/accounting/invoice-detail`.
- Core3 contracts: `services/accounting/pages/invoice-detail.yaml` and `services/accounting/api/invoice-detail.yaml`.
- Durable migration: `services/accounting/migrations/20260922240000-057-accounting-invoice-payment-block.yaml`.
- Focused test: `test/accounting_invoice_payment_block.integration.test.ts`.

This is a bounded candidate, not Accounting module sign-off.
