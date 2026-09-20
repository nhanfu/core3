# ECOM-CHECKOUT-PAYMENT-TOKEN-SELECTION-001 evidence

Bounded Ecommerce slice: selecting a saved payment token during authenticated
checkout.

- Odoo source: the payment form exposes customer-owned `tokens_sudo`; Website
  Sale accepts token flow and passes the sale order into transaction creation;
  `payment.transaction` stores `token_id`.
- Core3 contracts: `services/ecommerce/pages/checkout.yaml` and
  `services/ecommerce/api/checkout.yaml` remain separate and join by
  `page.id: ecommerce-checkout`; Payment Transactions expose `token_id`.
- Durable schema: migration `20260920330000-065-ecommerce-payment-token-checkout.yaml`
  adds the transaction token link and index.
- Focused proof: `test/ecommerce_checkout_payment_token.integration.test.ts` —
  4 tests, 25 assertions; adjacent checkout/payment suites also pass.
- Core3 authenticated desktop/mobile and Odoo paired rendering are blocked as
  recorded in `browser-check.md`; no UI sign-off is claimed.

This is a bounded verified slice, not Ecommerce module sign-off. Live provider
charging and broader actor/browser coverage remain open.
