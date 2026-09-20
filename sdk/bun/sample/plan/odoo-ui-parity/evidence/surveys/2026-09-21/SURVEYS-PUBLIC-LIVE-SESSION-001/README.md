# Surveys public live-session participant renderer

- Feature: `SURVEYS-PUBLIC-LIVE-SESSION-001`
- Odoo source behavior: public `/s` and `/s/<session_code>` live-session
  participant entry, joined through the session-code flow and answered through
  the current-question flow.
- Core3 page/API source: `services/surveys/pages/live-session-join.yaml` and
  `services/surveys/api/live-session-join.yaml`.
- Core3 binding: `public/app.ts` and `public/components/PublicLiveSession.ts`.
- Evidence: authenticated Admin Core3 desktop/mobile join, answer, and reload
  at 1440x900 and 390x844.
- Odoo blocker: `http://127.0.0.1:8072/s/5822` refused connections in both
  viewport probes (`net::ERR_CONNECTION_REFUSED`). No paired Odoo sign-off.

This is a bounded Core3 pass; Surveys remains `qa-in-progress / conditional`.
