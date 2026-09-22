# Odoo analysis

Source revision: `659759969d535d286b656c96b675e4612b925ddd` (`65975996`).

Inspected `/home/nhanjs/projects/odoo/addons/mass_mailing/views/mailing_trace_views.xml`:
`action_view_mail_mail_statistics_mailing` is a window action over
`mailing.trace`, named **Mail Statistics**, with `graph,list,form,pivot` and
context `{'search_default_mass_mailing_id': active_id}`. The source search and
list/form views provide state, sent/click/open/reply dates, failure details,
recipient, mailing, and marketing fields.

Inspected `security/ir.model.access.csv`: `access_mailing_trace_mm_user`
grants the mass-mailing user group read/write/create/unlink on traces, so the
Core3 action uses `email_marketing.read`; the separate technical menu remains
settings-only.
