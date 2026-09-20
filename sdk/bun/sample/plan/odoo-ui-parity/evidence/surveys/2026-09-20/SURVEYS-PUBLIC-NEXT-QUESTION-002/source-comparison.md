# Source comparison

Odoo's `/survey/next_question/<survey_token>/<answer_token>` implementation is
in `/home/nhanjs/projects/odoo/addons/survey/controllers/main.py:537-611`.
It validates the answer, saves the displayed page's answers, computes the
next ordered page/question, and renders the next question.

Core3's service/API implementation remains in `services/surveys/module.ts`,
`services/surveys/api/surveys.yaml`, and migration
`20260920230000-022-survey-public-navigation.yaml`. This wave closes the
caller gap in `public/components/PublicSurvey.ts`: the rendered Next control
now calls the service route and uses its returned question instead of
incrementing only a local index.
