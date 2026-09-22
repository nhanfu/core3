# SURVEYS-CARD-SEE-RESULTS-001

Bounded parity slice for the Odoo Surveys kanban-card `See results` action.

- Odoo source: `addons/survey/views/survey_survey_views.xml:311-315`
- Odoo model action: `addons/survey/models/survey_survey.py:1088-1096`
- Core3 page/API contract: `page.id: surveys`; results pair `page.id: survey-results`
- Stable action: `open_survey_results_card`
- Core3 route: `/surveys/results?survey_id=<stable survey id>`
- Permission: `surveys.read`

Screenshots are retained outside Git under `/tmp`:

- Odoo Cards, 1916x833: `/tmp/odoo-surveys-card-see-results-20260922.png`
- Odoo Results after clicking Feedback Form `See results`, 1916x833: `/tmp/odoo-surveys-results-from-card-20260922.png`

No credentials, cookies, tokens, or browser profile data are committed.
