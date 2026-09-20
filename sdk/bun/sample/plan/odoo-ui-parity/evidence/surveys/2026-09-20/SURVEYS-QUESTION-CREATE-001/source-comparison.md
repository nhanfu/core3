# SURVEYS-QUESTION-CREATE-001 source comparison

Date: 2026-09-20
Feature: Odoo Survey form Questions-tab inline `Add a question`
Reference source: Odoo 19 `addons/survey/views/survey_survey_views.xml`, lines 75-100

## Odoo menu/action analysis

The control is inside the Survey form's `question_and_page_ids` one2many
(`widget="question_page_one2many"`) and uses the `add_question_control`
create entry. Odoo supplies `default_survey_id` through the parent context,
appends the ordered question graph, and leaves the existing `Add a section`
control beside it. The installed `core3_reference` database is authenticated
and reachable on port 8073, but its Surveys addon is uninstalled; navigating
the expected `/odoo/surveys` route falls back to authenticated Discuss. Those
truthful fallback captures are named `odoo-*-authenticated-fallback.png` in
this directory and are not treated as a visual parity pass.

## Core3 source comparison

Core3 keeps the page and backend contracts separate and joins them through
`page.id: survey-detail`:

- `services/surveys/pages/survey-detail.yaml` exposes the inline grid action
  `add_survey_question` with `surveys.write`.
- `services/surveys/api/survey-detail.yaml` declares the `server_form` action
  `surveys.questions.create_inline`, with the same permission, parent survey
  domain, refresh targets, and four editable fields. The mutation computes the
  next sequence from durable rows, inserts a non-section question, increments
  the parent `row_version`, and uses fixed timestamps for deterministic tests.
- `test/surveys_question_create.integration.test.ts` verifies the page/API
  join, action contract, CRUD persistence, generated sequence, validation,
  stale-parent and archived guards, and file-backed restart persistence.

The existing `survey_questions` schema and Feedback Form fixture already
contain the Odoo-derived ordered question graph, so this slice adds no schema
or demo migration. The UI evidence shows the shared line-item control creating
questions 8 and 9 on desktop and mobile; both viewports reported no horizontal
overflow and no page/request errors.

Evidence capture was authenticated as Core3 `admin@tms.local` and Odoo
`codex@core3.local`. Odoo did not expose an installed Surveys screen in the
current reference database, so Odoo evidence is explicitly a fallback rather
than a sign-off claim.
