# Odoo analysis

Source: `/home/nhanjs/projects/odoo/addons/purchase` (Odoo 19).

- `views/purchase_views.xml:228-234` defines the `receipt_reminder_email`
  checkbox, the `Ask confirmation` label, `reminder_date_before_receipt`, and
  the `send_reminder_preview` toaster title.
- `views/purchase_views.xml:876-885` binds the form `Send Reminder` server
  action to `purchase.group_send_reminder`.
- `models/purchase_order.py:1064-1109` implements the reminder workflow. The
  single-order action opens the reminder composer; the preview action sends a
  sample to the signed-in user and returns a toast without changing order state.
- `data/mail_template_data.xml:81-123` defines `Purchase: Vendor Reminder`,
  its vendor recipient, expected-arrival copy, acknowledgement link, and
  responsible signature.

The live authenticated audit was attempted against the required browser
instance `245ea108`, Odoo `http://localhost:8069`, and the existing user tab
`1770662590`. The extension required explicit borrow confirmation and left the
borrow command pending; it was stopped without accessing the tab. Therefore
no live labels, viewport captures, or request trace are claimed for this
feature.
