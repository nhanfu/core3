# Source comparison

## Odoo 19

- `/home/nhanjs/projects/odoo/addons/survey/models/survey_survey.py:55`
  defines `color` as an integer color index with default 0.
- `/home/nhanjs/projects/odoo/addons/survey/views/survey_survey_views.xml:237-243`
  renders the kanban menu's `Color` entry and `kanban_color_picker`.

## Core3

- `services/surveys/pages/surveys.yaml` declares the stable `Color` row action.
- `services/surveys/api/surveys.yaml` owns the `color` server form and projects
  `COALESCE(s.color, 0)` from the list datasource; the fragments join at
  `page.id: surveys`.
- `services/surveys/migrations/20261103000000-072-survey-card-color.yaml`
  adds the durable column.
- `test/surveys_card_color.integration.test.ts` covers binding, guards,
  persistence, and restart.

The Core3 action uses the shared Odoo-palette color control. Exact Odoo
desktop/mobile visual comparison is blocked by BrowserSkill tab ownership.
