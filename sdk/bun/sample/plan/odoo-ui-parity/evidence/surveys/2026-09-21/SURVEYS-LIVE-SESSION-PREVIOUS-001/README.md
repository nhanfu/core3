# Surveys authenticated live-session previous question

- Feature: `SURVEYS-LIVE-SESSION-PREVIOUS-001`
- Source behavior: Odoo authenticated session navigation accepts `go_back` in
  `survey_session_next_question` and selects the preceding ordered question.
- Core3 contracts: `services/surveys/api/live-session.yaml` and
  `services/surveys/pages/live-session.yaml`, joined by
  `page.id: survey-live-session`.
- Core3 test: `test/surveys_live_session_previous.integration.test.ts`.
- Core3 browser artifacts: `core3-browser-results.json`, `core3-desktop.png`,
  and `core3-mobile.png`.
- Odoo browser artifacts: `odoo-browser-results.json`, `odoo-desktop.png`, and
  `odoo-mobile.png`.

The Core3 browser probe is conditional: the authenticated frontend listed the
Surveys route, but its backend returned `404 Unknown page: survey-live-session`
because the shared runtime page registry exposed only Blog pages. Odoo's
`/s/5822` route is reachable, but the session-code validator returns
`{"error":"survey_wrong"}`; no matching active live-session fixture exists.
No visual parity sign-off is claimed.
