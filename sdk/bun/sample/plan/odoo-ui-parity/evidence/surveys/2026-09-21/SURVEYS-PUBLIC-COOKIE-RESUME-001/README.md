# SURVEYS-PUBLIC-COOKIE-RESUME-001

This bounded slice clones Odoo's public survey response-cookie resume
behavior. `survey_start` reads `survey_<survey_token>` when an explicit answer
token is absent, ignores a stale cookie, and sets a 24-hour cookie for the
resolved answer. Core3 keeps the page renderer and API contract separate while
the public controller owns the token-scoped cookie transport.

- Implementation: `services/surveys/module.ts`.
- Paired contracts: `services/surveys/pages/surveys.yaml` and
  `services/surveys/api/surveys.yaml`, joined by `page.id: surveys`.
- Durable/concurrency/restart proof:
  `test/surveys_public_cookie_resume.integration.test.ts`.
- Core3 authenticated desktop/mobile probe:
  `core3-authenticated-desktop-cookie-resume.png`,
  `core3-authenticated-mobile-cookie-resume.png`, and
  `core3-browser-results.json`.
- Odoo desktop/mobile comparison:
  `odoo-desktop-cookie-resume.png`, `odoo-mobile-cookie-resume.png`, and
  `odoo-browser-results.json`.
- Exact runtime and reference limitations: `runtime-blocker.json`.

The implementation and focused tests pass. The browser artifacts are evidence,
not sign-off: the fresh Core3 runtime did not expose the Surveys public API,
and Odoo only exposed the host-controlled Feedback Form waiting state for the
available fixture.
