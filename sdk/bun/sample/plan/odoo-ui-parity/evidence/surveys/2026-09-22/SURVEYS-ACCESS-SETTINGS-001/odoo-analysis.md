# Odoo analysis

Source revision `65975996` (Odoo 19), addon `survey`.

`addons/survey/models/survey_survey.py` defines `access_mode` with `public`
(“Anyone with the link”) and `token` (“Invited people only”),
`users_login_required`, `users_can_go_back`, `is_attempts_limited`, and
`attempts_limit`. Limited attempts must be positive; anonymous public surveys
cannot use the limit; and roaming conflicts with scoring after each page.

`addons/survey/views/survey_survey_views.xml` renders these controls in
Options → Participants: Access Mode, Require Login, Limit Attempts, “to N
attempts,” and Allow Roaming. The authenticated live reference at
`http://localhost:8069/odoo/surveys`, database `core3_reference`, showed the
same labels and conditional attempts row on MyCompany Vendor Certification.
