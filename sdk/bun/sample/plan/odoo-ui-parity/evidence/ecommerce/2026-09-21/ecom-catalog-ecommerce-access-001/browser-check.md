# Browser and Odoo check

No authenticated Core3 desktop/mobile screenshots were captured. Core3 ports
3000, 4312, and 4313 refused connections, and no persistent browser runtime
(`js_repl`) is available for an authenticated actor journey.

The supplied Odoo references were probed at `/shop`:

```text
http://127.0.0.1:8069/shop -> HTTP 404
http://127.0.0.1:8073/shop -> HTTP 404
```

The references do not expose the Website/eCommerce route needed for paired
Shop Visibility rendering. Browser and paired Odoo gates remain blockers; no
UI sign-off is claimed.
