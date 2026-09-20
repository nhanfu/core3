# Source comparison

## Odoo reference

- `addons/survey/models/survey_question.py`: Matrix `question_type`,
  `matrix_subtype`, `matrix_row_ids`, `suggested_answer_ids`, and
  `_validate_matrix`.
- `addons/survey/models/survey_user_input.py`: `_save_line_matrix` persists
  one or more selected columns per matrix row.
- `addons/survey/controllers/main.py`: Matrix answers are submitted as a
  row-keyed mapping whose values are selected columns.
- `addons/survey/data/survey_demo_feedback.xml`: the demo uses the title
  `What do you think about our new eCommerce?`, four columns, five rows, and
  `matrix_subtype=multiple`.

## Core3 implementation

- Migration `0.0.29` adds an optional deterministic certification Matrix
  question and nine durable row/column answer records.
- `operations.yaml` projects `matrix_rows`, `matrix_columns`, and
  `matrix_subtype` in public question/current/next/previous/print operations.
- `PublicSurvey.ts` renders a responsive row/column table and collects a
  row-to-column JSON map.
- `module.ts` rejects foreign rows, foreign columns, duplicate cells, and
  malformed Matrix values before public progress/submit mutation. Required
  Matrix questions additionally require every source-defined row.
- Page and API YAML remain separate and joined by `page.id: surveys`; public
  mutations retain `surveys.public`.
