# Odoo source analysis

Source revision: `659759969d535d286b656c96b675e4612b925ddd`.

- `addons/hr_recruitment/views/hr_applicant_views.xml` binds the applicant
  server action `action_applicant_send_mail`, labeled `Send Email`, to list and
  kanban views.
- `addons/hr_recruitment/models/hr_applicant.py` implements
  `action_send_email`, opening the `applicant.send.mail` composer for selected
  applicant IDs.
- `addons/hr_recruitment/wizard/applicant_send_mail.py` requires recipient
  email addresses, renders subject/body, copies attachments to each applicant,
  and posts the message.
- `addons/hr_recruitment/wizard/applicant_send_mail_views.xml` exposes subject,
  selected applicants, HTML body, attachments, template loading, Send, and
  Cancel controls.

The Core3 slice intentionally stops at durable sent-message audit records;
SMTP delivery, complete chatter/follower behavior, and external queue retry
are not represented in this bounded implementation.
