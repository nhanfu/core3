# Surveys public completion message — `SURVEYS-PUBLIC-END-MESSAGE-001`

Bounded evidence for the next uncovered public participant behavior: Odoo's
configured `description_done` completion message.

- Implementation: `services/surveys/operations.yaml`,
  `services/surveys/pages/surveys.yaml`, migration `0.0.25`, and the
  Surveys-owned `public/components/PublicSurvey.ts` renderer.
- Tests: `test/surveys_public_end_message.integration.test.ts` plus adjacent
  public response, retry, deadline, validation, and scoring tests.
- Browser evidence: `core3-browser-results.json`,
  `core3-authenticated-{desktop,mobile}.png`, `odoo-browser-results.json`,
  and `odoo-{desktop,mobile}.png`.

Implementation and bounded persistence/guard tests pass. No visual or Odoo
sign-off is claimed because the shared runtime did not register the public
route and the live reference redirected the public token to login.
