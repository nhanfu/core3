# SURVEYS-ACTOR-MATRIX-001 source comparison

## Odoo source and action

The Odoo source workflow is the authenticated Survey form and its Questions
tab in `addons/survey/views/survey_survey_views.xml`. The form action owns the
survey definition and the `question_and_page_ids` one2many graph; Survey users
with write access can mutate the ordered question graph. The participant and
session controllers remain token/session scoped and are not widened by this
actor-matrix probe.

The live authenticated Odoo reference was probed at `/odoo/surveys` with
`codex@core3.local`. The route redirected to `/odoo/discuss` because the
reference database does not have the Surveys addon installed. Therefore there
is no live Odoo Survey form or Questions-tab screenshot to pair with Core3.
The authenticated fallback captures are retained as precise blocker evidence:
`odoo-desktop-fallback.png` and `odoo-mobile-fallback.png`.

## Core3 YAML-first contract

Core3 keeps the Survey detail page in
`services/surveys/pages/survey-detail.yaml` and its server form/API actions in
`services/surveys/api/survey-detail.yaml`. The existing `add_survey_question`
action is joined to `page.id: survey-detail`, requires `surveys.write`,
computes the next durable question sequence, increments the parent row
version, and returns explicit validation, stale, archived, and permission
errors. This probe exercises that contract through the rendered page rather
than treating YAML parsing as UI evidence.

## Actor results

- Administrator: loaded `/surveys/detail?id=survey-demo-feedback` at desktop
  1440x1000 and mobile 390x844, created a question in each session, and saw
  the rows persist after reload. The desktop question rendered at sequence 8;
  the mobile question rendered at sequence 9. Both probes had no page errors,
  failed requests, HTTP errors, or horizontal overflow.
- Fleet ordinary user: `/surveys` returned HTTP 403 with
  `Requires permission: surveys.read`; no survey data was disclosed.
- Anonymous mobile user: `/surveys` redirected to
  `/auth/login?redirect=%2Fsurveys` and rendered the login form.

These results establish the Core3 actor boundary and responsive mutation
surface. They do not establish Odoo visual parity while the reference addon
is absent.
