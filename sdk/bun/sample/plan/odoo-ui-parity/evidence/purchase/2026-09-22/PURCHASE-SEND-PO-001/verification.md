# Verification

## Odoo

Authenticated `core3_reference` at `http://localhost:8069`, route
`/odoo/purchase-orders/12?db=core3_reference`.

- Desktop browser view: `1916x833`; `Send PO` opened the `Compose Email` modal.
- Emulated iPhone 14 view: `390x844`; the same modal remained usable and showed
  recipient, subject, body, attachment, `Send`, and `Discard`.
- Captures: `odoo-desktop-compose.png`, `odoo-mobile-compose.png`.

## Core3

Isolated module runtime: `http://127.0.0.1:4015`, authenticated local QA
actor, route `/purchase/detail?id=po-demo-005`.

- Desktop detail loaded and showed `Send PO`; capture:
  `core3-desktop-detail.png`.
- Mobile detail loaded at `390x844`, showed `Send PO`, and had no observed page
  overflow; capture: `core3-mobile-detail.png`.
- Clicking `Send PO` produced no modal and no `/api/mutate` request. The
  buffered network trace ended with successful HTTP 200 page/datasource reads;
  there was no application console exception after the click.
- Result: backend contract and detail action visibility are verified; the
  shared `server_form`/mail-composer dispatch is an exact open blocker, so no
  Core3 composer visual or send-flow pass is claimed.
