# Source comparison

The supplied Odoo sources were inspected at:

- `addons/website_sale/views/website_sale_menus.xml`: the technical
  `menu_ecommerce_payment_transactions` entry opens
  `payment.action_payment_transaction`.
- `addons/payment/models/payment_transaction.py`: `payment.transaction`
  persists unique `reference`, provider/payment method, amount/currency,
  provider reference, company, customer, operation, and the
  draft/pending/authorized/done/cancel/error status model.
- `addons/payment/views/payment_transaction_views.xml`: list, kanban, form,
  search, graph, and pivot views; capture/void/post-process actions are
  status-dependent and create/edit are disabled on the list/form.

Core3 adds the smallest corresponding checkout boundary: durable transaction
creation from the existing payment-method selection, a unique checkout/order
idempotency key, company-scoped reads, and permissioned optimistic state
transitions. External provider adapters, tokenization, callbacks, capture,
void, and refund execution remain explicit follow-up boundaries.
