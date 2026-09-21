# Odoo 19 analysis

- Addon: `/home/nhanjs/projects/odoo/addons/mass_mailing_sms`.
- Retry implementation: `models/mailing_mailing.py`,
  `action_retry_failed_sms` searches failed `sms.sms`, removes their traces
  and records, then calls `action_put_in_queue`.
- Trace list/form: `views/mailing_trace_views.xml`,
  `mailing_trace_view_tree_sms` and `mailing_trace_view_form_sms`.
- Relevant visible fields: mailing, SMS number, sent date, click date, trace
  status, failure type, recipient, SMS ID/code, and marketing metadata.
- Source-backed boundary: provider `/sms/status` callbacks are implemented by
  Odoo's `sms` addon and are not part of this retry-state slice.

Authenticated reference probe at `http://localhost:8069`, database
`core3_reference`, using the shared QA login already present in the browser:
the Apps page lists `SMS Marketing`, but the authenticated app menu does not.
This proves the addon is available to install but not installed in the
reference database, so the SMS mailing form and trace action cannot be opened.
