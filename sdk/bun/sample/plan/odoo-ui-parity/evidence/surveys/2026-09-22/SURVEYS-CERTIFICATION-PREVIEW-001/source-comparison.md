# Source comparison

## Odoo 19

- `addons/survey/views/survey_survey_views.xml:151-153` renders a `Preview`
  object button beside the certification report layout and opens a new tab.
- `addons/survey/models/survey_survey.py:1131-1136` implements
  `action_survey_preview_certification_template` and returns
  `/survey/<survey_id>/certification_preview` with `target: new`.
- `addons/survey/controllers/main.py:686-700` renders the preview shell,
  creates a temporary test answer, generates the certification report, and
  removes the temporary answer.
- `addons/survey/views/survey_templates_print.xml:136-151` shows that the
  shell contains an iframe pointed at the generated certification report.

## Core3

- `pages/survey-detail.yaml` adds the permissioned
  `preview_survey_certification` action and only exposes it for active
  certified surveys.
- `pages/certification-preview.yaml` defines the new route with the shared
  `OdooFormView` and `TemplatePreview` primitives, plus Print and Back.
- `api/certification-preview.yaml` is a separate API fragment joined by
  `page.id: survey-certification-preview`. Its datasources project the six
  persisted layout values and deterministic printable blocks from `surveys`.
- No migration is needed: the certification flag/layout columns and
  optimistic row-version storage already exist from
  `SURVEYS-CERTIFICATION-TEMPLATE-001`.

The bounded difference is deliberate: Core3 renders safe text blocks rather
than generating a PDF or creating a temporary response row. The action,
permission boundary, layout selection, empty/error states, and printable
preview surface are covered without introducing a custom renderer.
