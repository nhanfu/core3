# SURVEYS-RESULTS-PRINT-001 source comparison

Date: 2026-09-20

## Odoo source trace

- `/home/nhanjs/projects/odoo/addons/survey/controllers/main.py:731-764`
  serves authenticated `/survey/results/<survey>` and computes filtered
  statistics for the selected completion/result cohort.
- `/home/nhanjs/projects/odoo/addons/survey/models/survey_survey.py:1088-1095`
  maps the survey result action to `/survey/results/<survey id>`.
- `/home/nhanjs/projects/odoo/addons/survey/views/survey_templates_statistics.xml:25`
  exposes the authenticated Results-page Print button; the loaded page uses
  `.o_survey_results_print`.

## Core3 implementation trace

- `services/surveys/pages/survey-results.yaml` is presentation-only and joins
  `api/survey-results.yaml` by `page.id: survey-results`. Its
  `OdooFormView` declares the permissioned Print header action.
- `services/surveys/api/survey-results.yaml` declares the result sources plus
  the `print_survey_results` client action and guarded
  `record_survey_results_print` server mutation.
- `services/surveys/migrations/20260920170000-019-survey-results-print-runs.yaml`
  creates the durable report-run table and deterministic seed.
- The handler records filtered response/question counts, actor, fixed
  timestamp, and row version, then refreshes the results sources and invokes
  `window.print()` in the client action.

## Paired runtime evidence

- Core3 authenticated Admin: desktop 1440x1000 and mobile 390x844. Both
  rendered the Results page, showed Print, reported no document overflow, and
  intercepted exactly one print invocation.
- Reachable Odoo authenticated `codex@core3.local` on
  `http://127.0.0.1:8069`: `/survey/results/feedback-form-1` rendered the
  source Results page and Print control at both viewports; each intercepted
  exactly one print invocation.
- The disposable seeded Surveys proxy documented by the parity plan at
  `127.0.0.1:8072` was unavailable during this run. Exact probe:
  `curl: (7) Failed to connect to 127.0.0.1 port 8072 after 0 ms: Could not connect to server`.
  The 8069 captures are the paired reachable-reference evidence; the 8072
  limitation is not treated as a sign-off.

Files: `core3-browser-results.json`, `odoo-browser-results.json`, and the
desktop/mobile before/after PNG captures in this directory.
