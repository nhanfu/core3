# Surveys certification report comparison

## Odoo source

- `addons/survey/controllers/main.py:704-723` exposes the authenticated
  `/survey/<int:survey_id>/get_certification` route, searches for a
  `survey.user_input` belonging to the current user with `scoring_success`,
  and rejects an unsuccessful attempt.
- `addons/survey/controllers/main.py:762-767` renders the
  `survey.certification_report` report.
- `addons/survey/models/survey_survey.py:122-153` defines certification and
  report-layout settings, including the certification template selection.

## Core3 mapping

- `services/surveys/api/certification-report.yaml` and
  `services/surveys/pages/certification-report.yaml` share
  `page.id: survey-certification-report`.
- `survey_certification_report` is permissioned with `surveys.read` and
  selects only `Completed` rows with `quiz_passed = true`.
- `surveys.certification.report` checks the passed state and requires
  `requested_by` to equal `current_user_name` before creating or replaying a
  durable report history row.
- The participant detail entry point is only visible for `quiz_passed:
  Passed`; the page print action records the run before `window.print()`.

This is a bounded print/report contract. Core3 does not claim Odoo QWeb PDF
byte-for-byte parity or participant-user identity mapping beyond the explicit
authenticated actor guard.
