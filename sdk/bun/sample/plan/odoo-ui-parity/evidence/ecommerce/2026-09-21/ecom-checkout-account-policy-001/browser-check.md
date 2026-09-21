# Browser and Odoo comparison

Authenticated Core3 browser evidence was attempted through the available
runtime procedure. No `js_repl` browser tool is available in this worker, and
the direct probes returned connection refusal:

- `http://127.0.0.1:3000/ecommerce/checkout-account-policy` — HTTP 000,
  connection refused.
- `http://127.0.0.1:4312/ecommerce/checkout-account-policy` — HTTP 000,
  connection refused.
- `http://127.0.0.1:4313/ecommerce/checkout-account-policy` — HTTP 000,
  connection refused.

The authenticated Core3 desktop/mobile screenshots and rendered form/modal
checks are therefore blocked; no UI sign-off is claimed.

Odoo comparison probes were executed exactly against the supplied shop route:

- `http://127.0.0.1:8069/shop` — HTTP 404.
- `http://127.0.0.1:8073/shop` — HTTP 404.

The exact Odoo `/shop` 404 blocks authenticated paired desktop/mobile
comparison. Odoo source/view comparison remains recorded in
`source-comparison.md`.
