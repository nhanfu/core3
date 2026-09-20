# Browser and reference checks

## Core3

Authenticated Core3 desktop/mobile capture was attempted by probing the known
runtime endpoints, but ports `3000`, `4312`, and `4313` were unavailable or
refused. No rendered UI pass is claimed.

## Odoo

The supplied Odoo reference instances returned exact HTTP `404` for `/shop` on
ports `8069` and `8073`. The Website Sale address/checkout surface therefore
cannot be paired at desktop or mobile. This is a blocker, not sign-off.
