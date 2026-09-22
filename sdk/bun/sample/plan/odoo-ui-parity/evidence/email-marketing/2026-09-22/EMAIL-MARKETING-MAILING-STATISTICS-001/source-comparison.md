# Source comparison

| Odoo behavior | Core3 implementation |
| --- | --- |
| `action_view_mail_mail_statistics_mailing` opens Mail Statistics for the active mailing | `view_email_mailing_statistics` navigates from mailing detail to `/email-mailings/statistics` with `mass_mailing_id`. |
| Window modes are `graph,list,form,pivot` | The scoped page exposes those four shared view modes and a read-only trace detail page. |
| Current mailing is supplied by `search_default_mass_mailing_id` | API SQL requires `mass_mailing_id` and applies it before search/status/test filters. |
| Ordinary mass-mailing users can read `mailing.trace` | Scoped API/detail use `email_marketing.read`; technical `/email-traces` remains `email_marketing.settings`. |
| Odoo action is read-only | Core3 exposes navigation only; no mutation action is declared. |
