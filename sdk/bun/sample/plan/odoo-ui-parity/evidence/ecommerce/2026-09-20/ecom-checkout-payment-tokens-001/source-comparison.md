# Source comparison

## Odoo

The supplied Odoo source maps `website_sale/views/website_sale_menus.xml`
`menu_ecommerce_payment_tokens` to `payment.action_payment_token` and marks the
menu `base.group_no_one` (technical users only). The supplied
`payment/views/payment_token_views.xml` defines `payment.token` list/form/search
views with `create="false"`, `edit="false"`, masked `payment_details`,
`payment_method_id`, `partner_id`, `provider_id`, `provider_ref`, and company;
the search exposes archived filtering and provider/partner/company grouping.
Payment security rules scope normal users to their own partner tokens and to
their companies. The Website Sale override excludes saved tokens from express
checkout.

## Core3

Core3 adds the corresponding technical list page/API with separate YAML
contracts and a company/customer-scoped datasource. Provider-created
registration accepts only masked details, validates an enabled tokenizable
provider/method and active same-company customer, and is idempotent by an
external boundary key. Retirement is an optimistic-concurrency archive action;
there is intentionally no unarchive action because Odoo prevents unarchiving a
token linked to an inactive method/provider. No secret/card PAN is persisted.

The Core3 route is `/ecommerce/payment-tokens`; API `page.id` is
`ecommerce-payment-tokens`. The Core3 menu remains permissioned by
`ecommerce.read`; the source technical-group restriction is recorded as an
open broader actor/permission gate.
