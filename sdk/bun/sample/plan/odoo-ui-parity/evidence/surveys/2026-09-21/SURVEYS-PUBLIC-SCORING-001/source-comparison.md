# Source comparison

Odoo source inspected:

- `/home/nhanjs/projects/odoo/addons/survey/models/survey_user_input.py`:
  `_compute_scoring_values` computes total possible score from positive
  suggested answers, stores a rounded percentage, and `_compute_scoring_success`
  compares it with `survey_id.scoring_success_min`.
- `/home/nhanjs/projects/odoo/addons/survey/models/survey_survey.py`: the
  default required score is 80%.
- `/home/nhanjs/projects/odoo/addons/survey/controllers/main.py`: public answer
  submission validates and saves answer lines, then marks the response done at
  the final question.

Core3 maps the source-backed result boundary to `survey_responses.score` and
`survey_responses.quiz_passed`. The API action stays separate from the page
fragment, uses `surveys.public`, and reads suggested values through
`survey.public.scoring_answers`. Simple-choice questions use the highest
positive score; multiple-choice questions sum positive selected scores; the
pass threshold is the deterministic 80% fixture default.

The source model also has a separate total-score field. This bounded slice
does not claim that additional aggregate/report fields are complete.
