# Surveys card Start Live Session evidence

- Source: Odoo `addons/survey/views/survey_survey_views.xml:317-321` exposes
  the kanban `Start Live Session` button; `addons/survey/models/survey_survey.py:1139-1158`
  transitions an eligible survey to a ready live session.
- Core3: `pages/surveys.yaml` references the card action and
  `api/surveys.yaml` owns the matching `surveys.sessions.start` mutation,
  joined by `page.id: surveys`.
- Persistence: the existing `survey_live_sessions` row stores `Ready`, start
  time, cleared current question state, counters, and incremented row version.
- Guards: `surveys.manage` permission, authenticated actor, Draft/Published
  survey with a non-section question, closed-session row version, and atomic
  update are covered.
- Browser: the one permitted BrowserSkill run opened authenticated Odoo
  `http://localhost:8069/odoo/surveys?db=core3_reference` at 1916x833. The
  sanitized reference capture is `/tmp/core3-odoo-parity/surveys-card-live-session-20260922/odoo-desktop.png`.
  The reference page loaded successfully; no Core3 visual claim is made.
- Credentials: none were recorded or exposed.
