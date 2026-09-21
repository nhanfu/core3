# Odoo analysis

- Addon/version: local Odoo 19 Community Purchase at
  `/home/nhanjs/projects/odoo/addons/purchase`.
- Form source: `views/purchase_views.xml:140`, `action_rfq_send` labelled
  `Send PO` when `state == 'purchase'`.
- Model source: `models/purchase_order.py:545-600`; `send_rfq=False` selects
  `purchase.email_template_edi_purchase_done` and opens
  `mail.compose.message` in a modal.
- Template source: `data/mail_template_data.xml:38-78`; it renders vendor,
  order reference, total, expected receipt date, acknowledgement link,
  signature, and `purchase.action_report_purchase_order` attachment.
- Live route: `http://localhost:8069/odoo/purchase-orders/12?db=core3_reference`
  (`P00012`), authenticated using the existing QA browser session.

Observed Odoo desktop and emulated iPhone 14 modal controls were `Compose
Email`, recipient `info@deltapc.example.com`, subject
`My Company (San Francisco) Order (Ref P00012)`, Purchase Order body,
`Purchase Order - P00012.pdf`, `Send`, and `Discard`.
