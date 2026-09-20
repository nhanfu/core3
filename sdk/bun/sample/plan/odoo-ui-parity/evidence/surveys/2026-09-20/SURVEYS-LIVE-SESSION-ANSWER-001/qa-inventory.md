# QA inventory

- Page/API pair: `survey-live-session-join`.
- Public API: `POST /api/public/surveys/session/<session_code>/answer`.
- Permission: `surveys.public`; read datasource remains `surveys.read`.
- Durable tables: `survey_live_attendees`, `survey_live_session_answers`.
- Migration: `20260920220000-021-survey-live-session-answers.yaml`, version
  `0.0.21`.
- Error matrix: inactive session 409, missing attendee 404, empty/invalid
  answer 422, duplicate current-question answer replayed without insertion.
- Browser viewports: 1440x900 and 390x844.
- Reference blocker: authenticated Odoo session code `5822` returns
  `survey_wrong`; evidence is retained in this directory.
