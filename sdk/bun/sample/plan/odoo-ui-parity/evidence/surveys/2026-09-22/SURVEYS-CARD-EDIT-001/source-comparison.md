# Source comparison

## Odoo 19

`/home/nhanjs/projects/odoo/addons/survey/views/survey_survey_views.xml:237-240`
defines the Survey kanban menu with the visible order `Edit Survey`, `Share`,
and `Delete`. `Edit Survey` uses the standard `open` action and is available
when the kanban is editable.

## Core3 before this slice

`services/surveys/pages/surveys.yaml` already exposed `row_actions: menu`,
`view_survey_detail` for row open/double-click, and Share/Test/lifecycle
actions. It did not expose a separately labeled `Edit Survey` menu action.

## Core3 after this slice

The same page now declares stable action `edit_survey`, permissioned by
`surveys.write`, targeting `/surveys/detail` with `{ id: '{row.id}' }`. The
existing `api/surveys.yaml` datasource remains the source of the selected
durable row, and the destination `survey-detail` page/API pair retains the
existing edit persistence and optimistic guards.
