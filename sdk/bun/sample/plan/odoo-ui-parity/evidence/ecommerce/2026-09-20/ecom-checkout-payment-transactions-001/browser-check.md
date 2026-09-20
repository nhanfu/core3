# Browser and paired-reference check

## Core3 authenticated desktop/mobile attempt

The normal dev frontend was started at `http://127.0.0.1:4313` with the
requested memory/demo runtime. The frontend was reachable, but its backend
dependency at `http://127.0.0.1:4312` did not become ready:

```text
GET http://127.0.0.1:4313/api/modules -> HTTP 502
GET /ecommerce/payment-transactions -> HTTP 502 route-load failure
backend port 4312 -> connection refused
```

The authenticated desktop (1440x900) and mobile (390x844) Payment
Transactions captures could not proceed. This is recorded as an environment
startup/discovery blocker; no Core3 browser sign-off is claimed and no shared
module was edited.

## Authenticated Odoo comparison

The supplied references were checked at the exact Website Shop route:

```text
http://127.0.0.1:8069/shop -> HTTP 404
http://127.0.0.1:8073/shop -> HTTP 404
```

The reference database does not expose the installed `website_sale` surface,
so paired Payment Transactions visual comparison is blocked rather than
silently inferred.
