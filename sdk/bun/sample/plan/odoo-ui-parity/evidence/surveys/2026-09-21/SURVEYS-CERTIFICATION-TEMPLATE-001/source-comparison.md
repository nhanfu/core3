# `SURVEYS-CERTIFICATION-TEMPLATE-001`

## Odoo source

- `addons/survey/models/survey_survey.py` defines the durable `certification`
  flag and the `certification_report_layout` selection with six values:
  `modern_purple`, `modern_blue`, `modern_gold`, `classic_purple`,
  `classic_blue`, and `classic_gold` (source lines 120-150).
- `addons/survey/views/survey_survey_views.xml` renders the certification
  checkbox, layout selector, and `Preview` action in the survey options form
  (source lines 151-165). The action opens
  `/survey/<survey>/certification_preview`.
- The inspected Survey model has no `company_id`; company scoping is not
  applicable to this source behavior.

## Core3 implementation

- `services/surveys/api/survey-detail.yaml` owns the
  `update_survey_certification_template` server form and its guarded update.
- `services/surveys/pages/survey-detail.yaml` owns the Certification group and
  binds the action through `page.id: survey-detail`; it does not duplicate the
  mutation contract.
- Migration `0.0.70` adds durable certification and layout columns, initializes
  deterministic defaults, and is safe to replay with `IF NOT EXISTS`.
- Guards cover `surveys.write`, authenticated actor, missing survey, archived
  or stale row, and the six source-supported layout values. The generic record
  mutation also rejects an unchanged optimistic-concurrency replay as a stale
  record.

## Bounded limitation

Odoo's certification pass check also depends on its scoring configuration. The
existing Core3 survey schema does not expose Odoo's scoring-type field, so this
slice persists and presents only the certification/template settings. Full
certification scoring parity remains open and is not claimed here.
