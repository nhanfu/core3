# Surveys public background QA inventory

Feature: `SURVEYS-PUBLIC-BACKGROUND-001`
Date: 2026-09-21

Before runtime verification, the bounded surface was inventoried:

- Core3 page: `services/surveys/pages/surveys.yaml`, `page.id: surveys`, authenticated `/surveys` admin shell.
- Core3 API: `services/surveys/api/surveys.yaml`, public asset action `surveys.public.background`, permission `surveys.public`.
- Backend route: `services/surveys/module.ts`, `GET /api/public/surveys/<token>/background`.
- Public renderer: `public/components/PublicSurvey.ts`, persisted `survey.background_image_url` binding.
- Durable fixture: migration `0.0.33`, published token `background-public-token-2026`.
- Source comparison: Odoo `addons/survey/models/survey_survey.py:62-63,206-210`, `addons/survey/controllers/main.py:441-447`, and `addons/survey/views/survey_templates.xml:10-24`.

Required probes: authenticated Core3 desktop and mobile admin/public states, asset request status, no request/page failures, no horizontal overflow, and paired Odoo desktop/mobile availability/blocker capture.
