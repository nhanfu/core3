# Verification

BrowserSkill connected to the active Chrome instance and opened a task-owned
authenticated tab at `http://localhost:8069/odoo/invoicing/10`. The observed
Odoo form was `INV/2026/00008`, Posted, with the expected invoice actions. The
reference journal did not enable Odoo's hash restriction, so Lock was not a
visible action and no live Lock click was attempted.

The Core3 authenticated browser pass could not begin. The isolated Accounting
server command failed during global page discovery before binding port 4012 due
to the unrelated CRM `send_lead_email_detail` reference. The global audit has
the corresponding unrelated CRM `send_leads_email` reference. No CRM files
were touched.

The BrowserSkill session was stopped after inspection. No credentials, cookies,
tokens, or screenshots were captured or committed.
