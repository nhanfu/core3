# Surveys — sub-plan

Status: `planning`

## Reference

- Odoo addon: `survey` (Odoo 19 Community)
- Source availability: available in the supplied Odoo checkout
- Odoo demo data: manifest/demo records available; include published, closed, and empty modes
- Core3 service: `surveys`

## UI inventory

- Surveys dashboard, Surveys, Questions, Participants/Answers, and Reporting menus.
- Survey list/kanban with draft/published/closed states, responsible user, questions, attempts, search/filter/group, duplicate, archive, and pager.
- Survey form/builder with title, intro, pages/sections, question types/options, scoring, access settings, email invitations, deadline, and publish/close actions.
- Participant/answer list and form, respondent survey flow (welcome/question/confirmation), analysis graph/pivot, mobile questionnaire, dialogs, and empty states.

## Core3 backend mock-data plan

Use `surveys`, `survey_pages`, `survey_questions`, `survey_options`, `survey_participants`, `survey_answers`, `survey_invites`, `survey_metrics`, and `survey_chatter`. `default` contains survey lifecycle states, pages/questions/options, respondents and answers, invitation metadata, and analysis values. States: `published`, `closed`, `empty`, `builder_edit`, `respondent_flow`, `metrics_graph`, `metrics_pivot`, `mobile`.

## Shared UI primitives

Builder/page navigation, question-type renderers, option/rating widgets, progress indicator, list/kanban/form, graph/pivot, publish/close dialog, answer form, and responsive questionnaire shell.

## Screenshots

Capture Odoo/Core3 at 1440x900 and 390x844 for dashboard, survey list/builder, participant answers, respondent flow, report graph/pivot, and empty/closed states.

## Acceptance criteria

- Survey menus, builder hierarchy, question types, scoring/access settings, respondent flow, reporting, and mobile layout match Odoo.
- Backend YAML covers all pages/questions/options, participants/answers, invitations, metrics, chatter, and empty states.
- Publish/close, edit/save/discard, answer navigation, search/filter/group, and report rendering work without a database.
