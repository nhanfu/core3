# Odoo analysis

- Source revision: `65975996` (Odoo 19), addon `survey`.
- Live URL: `http://localhost:8069/odoo/surveys/2`.
- Live database: `core3_reference`; authenticated existing QA session; no
  credentials, cookies, or tokens recorded.
- Source model: `addons/survey/models/survey_survey.py` defines
  `is_time_limited`, `time_limit` (default 10 minutes), and `_time_limit_check`.
  The constraint requires a non-null, strictly positive duration when enabled.
- Source view: `addons/survey/views/survey_survey_views.xml` renders the
  `Survey Time Limit` checkbox and `time_limit` with the `float_time` widget in
  the `Time & Scoring` group, followed by the literal `minutes`; the group is
  hidden for `survey_type == 'survey'` and the time control is hidden for live
  sessions.
- Public dependency: `addons/survey/controllers/main.py` checks the stored
  `start_datetime + time_limit` before public progress/submit; the existing
  Core3 public timer slice already covers that route-level behavior.
- Live observation: `MyCompany Vendor Certification` showed `Survey Time
  Limit` checked, `10:00`, and `minutes` in both desktop and iphone-14
  emulation. The same Options surface showed the four scoring modes, proving
this slice is distinct from scoring configuration.
