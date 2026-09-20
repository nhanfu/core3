# Source comparison

Odoo source inspected:

- `/home/nhanjs/projects/odoo/addons/survey/models/survey_survey.py` defines
  `description_done` as the translated End Message displayed when a survey is
  completed.
- `/home/nhanjs/projects/odoo/addons/survey/controllers/main.py` transitions a
  finished public answer to the completed response and renders the completed
  survey form.
- `/home/nhanjs/projects/odoo/addons/survey/views/survey_survey_views.xml`
  exposes the End Message field in the survey form.

Core3 maps this to the durable `surveys.description_done` field, seeded with a
fixed Feedback Form message. The public detail query returns it only for the
published token-scoped survey; the submit response wraps that detail, and the
renderer consumes the same value on immediate completion and submitted-token
resume. The API action remains separate from the page layout and uses the
existing `surveys.public` boundary.
