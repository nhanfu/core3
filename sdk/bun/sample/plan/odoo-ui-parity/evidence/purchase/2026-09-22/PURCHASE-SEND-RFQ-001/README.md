# Purchase RFQ composer evidence

Date: 2026-09-22

Feature: bounded Draft/Sent `Send RFQ` email composer.

## Odoo 19 source and live reference

- Source: `/home/nhanjs/projects/odoo/addons/purchase/models/purchase_order.py:545-600` (`action_rfq_send`).
- View: `/home/nhanjs/projects/odoo/addons/purchase/views/purchase_views.xml:134-147`.
- Live service: `http://localhost:8069`, database `core3_reference`.
- Live route: `/odoo/purchase/11?db=core3_reference` (P00011, RFQ).
- Desktop: authenticated form showed `Send RFQ`; the modal showed recipient
  `info@deltapc.example.com`, subject, body, RFQ PDF attachment, Send, and
  Discard. See `odoo-desktop-compose.png`.
- Mobile: same authenticated route in an emulated iPhone 14 viewport
  (`390x844` observed viewport). See `odoo-mobile-compose.png`. The bsk
  screenshot artifact is physically `1916x833`; the observed browser viewport
  was `390x844`.

## Core3 result

The authenticated shared Core3 runtime reached
`/purchase/detail?id=po-demo-001` and rendered the `Send RFQ` action and
existing chatter state. Clicking the action produced no network request,
modal, or console error. This is an exact browser blocker in shared action
dispatch; it is not claimed as a Core3 UI pass. API/mutation behavior is
covered by the focused integration tests and the declarative contract remains
page/API separated through `purchase-detail`.

## Acceptance mapping

- Durable table: `purchase_order_emails`, migration `20260922120000-030`.
- Action: `send_purchase_order_detail`, `server_form`, `mail_composer`.
- Guards: missing/stale/state/vendor/content/actor and `purchase.write`.
- History: `purchase_order_email_history` detail datasource and chatter.
- Confirmed `Send PO` is intentionally outside this bounded slice.
