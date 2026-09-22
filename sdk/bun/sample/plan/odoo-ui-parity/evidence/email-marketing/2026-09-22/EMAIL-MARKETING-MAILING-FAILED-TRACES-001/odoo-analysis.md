# Odoo analysis

Source revision: `659759969d535d286b656c96b675e4612b925ddd` (`65975996`).

Inspected `/home/nhanjs/projects/odoo/addons/mass_mailing/models/mailing.py`
(`MailingMailing.action_view_traces_failed` and
`_action_view_traces_filtered`), `views/mailing_mailing_views.xml`,
`views/mailing_trace_views.xml` (`filter_failed` is `trace_status = 'error'`),
and `security/ir.model.access.csv` (mailing-user trace read access).

The model action opens the shared trace window, sets the current mailing as the
search default, and enables the failed filter. Core3 keeps its existing
technical trace page/API permission boundary (`email_marketing.settings`).

BrowserSkill against `http://localhost:8069`, database `core3_reference`, showed
authenticated Discuss only; Email Marketing was not exposed, so no installed
action or visual claim was made.
