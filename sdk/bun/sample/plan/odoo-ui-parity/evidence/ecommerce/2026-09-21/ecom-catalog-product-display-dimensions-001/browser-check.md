# Browser and Odoo comparison

Authenticated Core3 desktop/mobile capture was attempted as required by the
QA inventory. This environment has no persistent `js_repl` browser runtime,
and no Core3 listener was available:

- `127.0.0.1:3000/ecommerce/products` — curl HTTP `000` (connection refused)
- `127.0.0.1:4312/ecommerce/products` — curl HTTP `000` (connection refused)
- `127.0.0.1:4313/ecommerce/products` — curl HTTP `000` (connection refused)

The authenticated Odoo comparison is explicitly blocked by the supplied
reference state:

- `127.0.0.1:8069/shop` — exact HTTP `404`
- `127.0.0.1:8073/shop` — exact HTTP `404`

No desktop/mobile screenshot or rendered UI sign-off is claimed.
