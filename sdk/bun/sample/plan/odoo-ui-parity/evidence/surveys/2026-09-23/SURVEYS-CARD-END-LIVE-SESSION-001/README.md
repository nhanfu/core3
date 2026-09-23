# SURVEYS-CARD-END-LIVE-SESSION-001

This bounded slice implements the Odoo Surveys kanban-card `End Live Session`
action.

- Odoo source: `addons/survey/views/survey_survey_views.xml:323-327` and
  `addons/survey/models/survey_survey.py:1166-1175`.
- Core3 page/API: `services/surveys/pages/surveys.yaml` and
  `services/surveys/api/surveys.yaml`, joined by `page.id: surveys`.
- Durable behavior: Ready/In Progress -> Closed, current question cleared,
  active live attendees completed, optimistic session version incremented,
  replay refused, restart retained.
- Focused test: `test/surveys_card_end_live_session.integration.test.ts`.

Odoo desktop and mobile reference captures were produced with BrowserSkill.
Core3 browser capture was blocked before server readiness by the unrelated
Events discovery error documented in `blockers.md`; no Core3 visual parity
claim is made.
