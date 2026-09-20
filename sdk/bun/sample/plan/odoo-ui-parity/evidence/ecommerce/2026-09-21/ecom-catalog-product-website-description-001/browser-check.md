# Browser and Odoo check

## Core3 authenticated desktop/mobile

The requested authenticated Products, Shop, and Product Detail capture at
desktop (`1440x900`) and mobile (`390x844`) was attempted through local runtime
probes. No Core3 HTTP listener was available: `/api/modules` refused
connections on ports 3000, 4312, and 4313 (HTTP 000 connection failures). No
rendered website-description pass or screenshot is claimed.

The shared repository audit also stops on an unrelated Timesheets page-schema
error: `components[0].search.categories` and
`components[0].search.or locations...` are rejected by the validator. No
Timesheets files were modified.

## Odoo comparison

Exact HTTP probes of the supplied references returned:

```text
http://127.0.0.1:8069/shop -> HTTP 404
http://127.0.0.1:8073/shop -> HTTP 404
```

The supplied reference databases do not expose the Website/eCommerce `/shop`
surface, so authenticated desktop/mobile paired comparison is blocked.
