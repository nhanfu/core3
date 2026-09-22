# Odoo analysis

Source revision: `659759969d535d286b656c96b675e4612b925ddd` (`65975996`).

Relevant source:

- `/home/nhanjs/projects/odoo/addons/mass_mailing/models/mailing.py`,
  `MailingMailing.action_compare_versions`.
- `/home/nhanjs/projects/odoo/addons/mass_mailing/views/mailing_mailing_views.xml`,
  the `A/B Tests` notebook page and `action_compare_versions` button.

The method requires a campaign and returns an `A/B Tests` window for the
campaign's A/B-enabled mailings with view modes
`list,kanban,form,calendar,graph`; it also preserves the mailing type in the
domain. The source button is labeled **Compare Version** and is shown only
when at least two A/B mailings exist.

The required live Odoo comparison was not reachable. BrowserSkill instance
`245ea108` was connected, but the authenticated user tab `1770662590` was
already borrowed by session `ebbh`; no Odoo menu/action route was inspected.
The tab was not navigated, and no credentials, cookies, tokens, or passwords
were accessed or recorded. No installed-reference desktop/mobile capture is
available, so no visual-parity claim is made.
