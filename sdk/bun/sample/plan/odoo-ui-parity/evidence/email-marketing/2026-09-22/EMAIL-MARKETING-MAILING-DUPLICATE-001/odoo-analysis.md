# Odoo analysis

Source revision: `659759969d535d286b656c96b675e4612b925ddd` (`65975996`).

- Addon: `/home/nhanjs/projects/odoo/addons/mass_mailing`.
- Source model method: `addons/mass_mailing/models/mailing.py`,
  `MailingMailing.action_duplicate`.
- Source view: `addons/mass_mailing/views/mailing_mailing_views.xml`,
  `view_mail_mass_mailing_form`.
- The form exposes **Duplicate** with `type="object"`, hotkey `d`, and only
  when `state == 'done'` (display label: **Sent**).
- The method calls `copy()` on the one mailing and opens the copied
  `mailing.mailing` in a form view. Odoo copy semantics reset fields marked
  `copy=False`, including state, favorite, sent date, and computed delivery
  statistics; the duplicate is therefore a new draft mailing with copied
  audience/content fields.
- The source method has no confirmation wizard and no external mail send.

Live authenticated check on 2026-09-22:

- URL: `http://localhost:8069`, existing QA login session, database requested
  by the task: `core3_reference`.
- Current route: `/odoo`, title **Discuss**.
- App launcher contained Discuss, Calendar, Contacts, CRM, Sales, and other
  installed apps, but no Email Marketing entry or mailing action.
- Capture: `/tmp/odoo-email-marketing-duplicate-reference-blocker-desktop-20260922.png`.
- Exact blocker: the installed authenticated Odoo duplicate form cannot be
  reached because Email Marketing is not installed/exposed in this live
  database. This is recorded as a reference blocker, not as parity evidence.
