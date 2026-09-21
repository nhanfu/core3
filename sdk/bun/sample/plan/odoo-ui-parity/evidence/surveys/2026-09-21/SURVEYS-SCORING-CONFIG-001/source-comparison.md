# SURVEYS-SCORING-CONFIG-001 source comparison

Date: 2026-09-21

Reference: local Odoo 19 source at `/home/nhanjs/projects/odoo`, addon `survey`, revision `65975996` (`19.0`).

Odoo source-backed behavior:

- `addons/survey/models/survey_survey.py:108-114` defines `scoring_type` with four values: `no_scoring`, `scoring_with_answers_after_page`, `scoring_with_answers`, and `scoring_without_answers`; `scoring_success_min` defaults to 80.
- `addons/survey/models/survey_survey.py:181-188` requires scoring for certifications and constrains the required score to 0..100.
- `addons/survey/models/survey_survey.py:437-443` rejects `scoring_with_answers_after_page` with `users_can_go_back`.
- `addons/survey/views/survey_survey_views.xml:130-188` renders the Options form's Time & Scoring group and the four scoring labels, required score, certification, and live-session controls.
- `addons/survey/data/survey_demo_certification.xml:13` seeds the certification with `scoring_with_answers`; `addons/survey/data/survey_demo_conditional.xml:10-11` seeds Burger Quiz with `scoring_with_answers` and a 55% threshold.

Core3 implementation:

- `services/surveys/api/survey-detail.yaml` owns `update_survey_scoring`, its four-option server form, permission, optimistic concurrency, state, actor, threshold, certification, and roaming guards.
- `services/surveys/pages/survey-detail.yaml` owns the Time & Scoring display group and header action; both files bind through `page.id: survey-detail`.
- `services/surveys/operations.yaml` and `services/surveys/module.ts` carry the selected scoring type and required-score threshold into public score/pass evaluation.
- Migration `services/surveys/migrations/20261102000000-071-survey-scoring-settings.yaml` adds durable columns and Odoo-backed demo defaults.

The inspected Odoo `survey.survey` model has no `company_id`; company scoping is not applicable to this slice.
