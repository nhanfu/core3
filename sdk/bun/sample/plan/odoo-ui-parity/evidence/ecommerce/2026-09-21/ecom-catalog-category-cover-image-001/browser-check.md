# Browser and reference checks

Date: 2026-09-21

## Core3

Authenticated desktop and mobile browser capture was attempted by probing the
available development endpoints. Ports `3000`, `4312`, and `4313` returned
HTTP status `000` (no listener). This session also has no persistent `js_repl`
browser runtime. No screenshot, rendered UI pass, or responsive sign-off is
claimed.

## Odoo

The supplied reference endpoints on ports `8069` and `8073` returned exact
HTTP `404` for `/shop`. The Website Sale reference route is therefore
unavailable, so authenticated desktop/mobile comparison and exact rendered
category-cover comparison are blocked.
