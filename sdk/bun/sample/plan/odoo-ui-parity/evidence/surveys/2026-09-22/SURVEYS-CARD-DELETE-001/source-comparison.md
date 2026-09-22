# Source comparison

## Odoo 19

- Addon: `survey`, revision `65975996`.
- Source: `/home/nhanjs/projects/odoo/addons/survey/views/survey_survey_views.xml:237-240`.
- The Survey kanban `menu` template contains `Edit Survey`, `Share`, and a
  `type="delete"` menu item. The delete item is exposed only when the card is
  editable/deletable under Odoo's normal model access checks.

## Core3 before this slice

- `services/surveys/pages/surveys.yaml` exposed Cards and the row menu, but
  had no card-level Delete action.
- `services/surveys/api/survey-detail.yaml` already contained the durable,
  optimistic `surveys.records.delete` mutation and cascading dependent-row
  cleanup used by the detail form.

## Core3 after this slice

- `pages/surveys.yaml` declares `delete_survey_card` with the exact `Delete`
  label, trash icon, danger treatment, and `surveys.write` permission.
- The action confirms the selected title, submits `id` and `row_version` to
  `/api/actions/surveys.records.delete`, and returns to `/surveys`.
- No duplicate backend delete graph was added. The Cards page/API pair keeps
  `page.id: surveys`; the existing API-owned mutation remains authoritative.
