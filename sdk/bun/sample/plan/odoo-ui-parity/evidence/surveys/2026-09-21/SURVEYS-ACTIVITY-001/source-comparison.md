# SURVEYS-ACTIVITY-001 source comparison

Date: 2026-09-21

## Odoo source

- `addons/survey/models/survey_survey.py:23` inherits `mail.thread` and `mail.activity.mixin`.
- `addons/survey/views/survey_survey_views.xml:333` renders `activity_ids` in the Survey kanban activity widget.
- `addons/survey/views/survey_survey_views.xml:373-385` defines activity filters for the Survey search surface.

## Core3 implementation

- Migrations `0.0.56` and `0.0.57` add `survey_activities` with a deterministic planned fixture.
- `api/survey-detail.yaml` exposes the durable activity datasource plus separate schedule and mark-done actions.
- `pages/survey-detail.yaml` binds the activity source and actions through the existing `page.id: survey-detail` OdooFormView contract.
- Scheduling and completion require `surveys.write`, an authenticated actor, valid activity type/date/content, an active survey, and optimistic parent/activity row versions.

This bounded slice covers authenticated Survey activity scheduling and completion. It does not claim Odoo mail transport, chatter rendering byte parity, or the full activity search/kanban menu.
