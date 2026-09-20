# Browser and paired-reference check

## Core3

Authenticated desktop (1440x900) and mobile (390x844) capture was attempted
against the normal Core3 launcher. Discovery stopped before the Ecommerce
route could load because the unrelated shared Inventory API contains the
existing boundary error:

```text
services/inventory/api/physical-inventory.yaml:
actions[0].title is not allowed
```

No Inventory files were edited or staged. No browser sign-off is claimed for
this bounded slice.

## Odoo

The supplied authenticated reference endpoints were checked at the exact
Website Shop route:

```text
http://127.0.0.1:8069/shop -> HTTP 404
http://127.0.0.1:8073/shop -> HTTP 404
```

The installed reference database therefore does not expose the paired
`website_sale` surface. Odoo visual/comparison sign-off is blocked, not
silently inferred.
