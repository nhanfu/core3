# Source comparison

## Odoo Payment / Website Sale

- `addons/website_sale/views/website_sale_menus.xml`: the
  `menu_ecommerce_payment_transactions` menu opens
  `payment.action_payment_transaction`.
- `addons/payment/models/payment_transaction.py`: `is_post_processed` is a
  durable Boolean, `action_post_process` invokes `_post_process`, and generic
  `_post_process` marks the transaction processed.
- `addons/payment/views/payment_transaction_views.xml`: the Post-process
  object button is hidden when `is_post_processed` is true and the action
  returns a soft reload.

## Core3 mapping

- Migrations `20260921230000-110` and `20260921231000-111` add durable
  post-processing state/timestamp, index, and deterministic existing-row
  backfill.
- `services/ecommerce/api/payment-transactions.yaml` and
  `services/ecommerce/pages/payment-transactions.yaml` remain separate and
  join through `page.id: ecommerce-payment-transactions`.
- The API read uses `ecommerce.read`; post-processing uses `ecommerce.write`,
  optimistic `row_version`, current-company scope, and one-shot guards.
- Checkout-created transactions initialize `is_post_processed = FALSE`; state
  transitions clear the flag and timestamp, matching Odoo's reset-on-state
  update behavior.
