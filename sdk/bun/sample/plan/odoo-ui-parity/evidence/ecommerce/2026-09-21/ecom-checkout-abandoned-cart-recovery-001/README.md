# ECOM-CHECKOUT-ABANDONED-CART-RECOVERY-001

Bounded Wave 26 evidence for Odoo Website Sale abandoned-cart recovery. Core3
implementation is company-scoped, durable, YAML-first, and keeps the recovery
policy page separate from its API/action contract.

The slice is verified at the source, repository, migration, policy, one-shot
send, and restart levels. It is not Ecommerce module sign-off: authenticated
browser capture is blocked by the local runtime and Odoo `/shop` is HTTP 404.

- Feature: abandoned-cart recovery policy and idempotent send ledger
- Core3 policy page: `/ecommerce/abandoned-cart-recovery-policy`
- Core3 carts page: `/ecommerce/abandoned-carts`
- Core3 API contracts: `services/ecommerce/api/abandoned-cart-recovery-policy.yaml` and `api/abandoned-carts.yaml`
- Core3 persistence: migrations `0.0.116` and `0.0.117`
- Focused test: `test/ecommerce_abandoned_cart_recovery.integration.test.ts`
