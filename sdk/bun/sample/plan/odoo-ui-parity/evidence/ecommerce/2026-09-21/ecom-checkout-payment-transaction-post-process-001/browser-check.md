# Browser and Odoo comparison

The required authenticated desktop/mobile rendered evidence could not be
captured in this workspace. No persistent `js_repl` browser runtime is
available, and direct Core3 probes to the transaction route returned
connection refused:

- `http://127.0.0.1:3000/ecommerce/payment-transactions` — HTTP `000`
- `http://127.0.0.1:4312/ecommerce/payment-transactions` — HTTP `000`
- `http://127.0.0.1:4313/ecommerce/payment-transactions` — HTTP `000`

The supplied Odoo comparison probes were exact blockers:

- `http://127.0.0.1:8069/shop` — HTTP `404`
- `http://127.0.0.1:8073/shop` — HTTP `404`

Therefore this evidence set contains no desktop/mobile screenshots, no
authenticated browser sign-in claim, and no Odoo UI parity sign-off.
