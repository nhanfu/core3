# Browser and reference checks

## Core3

Authenticated Core3 desktop/mobile evidence could not be captured in this
wave. Probes to ports `3000`, `4312`, and `4313` were unavailable/refused, so
no rendered UI pass is claimed. The Cart/Product Detail YAML contracts remain
auditable and are covered by the focused integration test.

## Odoo

The supplied Odoo reference instances returned exact HTTP `404` for `/shop` on
ports `8069` and `8073`. Because the Website Sale surface is unavailable,
authenticated desktop/mobile paired comparison cannot be performed. This is a
blocker, not a parity sign-off.
