# Browser and Odoo comparison

Authenticated Core3 desktop/mobile capture was attempted as required by the
QA inventory. No persistent `js_repl` browser runtime is available, and no
Core3 listener was available:

- `127.0.0.1:3000/ecommerce/products/detail?id=ecommerce-product-mug` — curl
  HTTP `000` (connection refused)
- `127.0.0.1:4312/ecommerce/products/detail?id=ecommerce-product-mug` — curl
  HTTP `000` (connection refused)
- `127.0.0.1:4313/ecommerce/products/detail?id=ecommerce-product-mug` — curl
  HTTP `000` (connection refused)

Supplied Odoo reference probes remain blocked:

- `127.0.0.1:8069/shop` — exact HTTP `404`
- `127.0.0.1:8073/shop` — exact HTTP `404`

No desktop/mobile screenshot or rendered UI sign-off is claimed.
