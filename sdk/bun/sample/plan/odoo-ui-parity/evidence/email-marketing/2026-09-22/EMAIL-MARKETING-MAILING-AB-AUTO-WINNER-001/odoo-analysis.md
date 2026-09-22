# Odoo analysis

Source revision: `659759969d535d286b656c96b675e4612b925ddd` (`65975996`).

Relevant source:

- `/home/nhanjs/projects/odoo/addons/mass_mailing/models/mailing.py`,
  `MailingMailing.action_send_winner_mailing` and
  `MailingMailing.action_select_as_winner`.
- `/home/nhanjs/projects/odoo/addons/mass_mailing/views/mailing_mailing_views.xml`,
  the A/B Tests notebook and **Send Winner Now** button.

Odoo requires a single campaign, rejects completed campaigns, chooses the best
sent sibling using the configured open/click/reply ratio, and delegates winner
creation to the existing final-mailing workflow. The source button is hidden
for manual selection, fewer than two variants, unsent tests, and completed
campaigns.

The required authenticated Odoo inspection against `http://localhost:8069`,
database `core3_reference`, was blocked because the shared signed-in tab was
already owned by another BrowserSkill session. No credentials, cookies, tokens,
or passwords were accessed or recorded.
