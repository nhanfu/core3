# Source comparison

## Odoo

The supplied `payment/views/payment_form_templates.xml` renders saved
`tokens_sudo` when token selection is allowed and tracks the selected token.
The Website Sale payment controller accepts `flow == 'token'`, includes
`sale_order_id` in transaction creation, and supports deferred token charging.
The supplied `payment/models/payment_transaction.py` defines the durable
`token_id` relation alongside provider and payment method fields. Payment
security rules scope tokens to the current partner and company.

## Core3

Core3 migration 065 adds `token_id` and an index to durable payment
transactions. The checkout API exposes an `ecommerce.read` token datasource
joined to the open cart, returning only active verified tokens whose customer,
company, and enabled provider match. The checkout page binds that datasource to
an optional saved-token field.

The authenticated checkout mutation keeps the existing `ecommerce.write`
permission and validates the selected token against cart customer/company,
payment method, active verification, and provider state before inserting one
idempotent transaction with `operation = offline_token`. Guest checkout has no
token field and cannot use a customer token. The transaction page/API exposes
the resulting token ID without exposing payment secrets.
