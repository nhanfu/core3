# Surveys public response evidence inventory

Feature: `SURVEYS-PUBLIC-RESPONSE-RESTART-001`
Date: 2026-09-20

## Core3 authenticated browser evidence

Runtime: isolated Core3 Surveys process on `http://127.0.0.1:4014`, seeded
published `Feedback Form`, authenticated as `admin@tms.local`, with the public
token route exercised through the rendered browser UI.

| Viewport | Before | Progress | After | Result |
| --- | --- | --- | --- | --- |
| Desktop 1440x1000 | `core3-authenticated-desktop-before.png` | `core3-authenticated-desktop-progress.png` | `core3-authenticated-desktop-after.png` | Start, seven question pages, Submit, and “Thank you for your response / Your answers have been submitted”; scroll width 1440 |
| Mobile 390x844 | `core3-authenticated-mobile-before.png` | browser loop covered each question | `core3-authenticated-mobile-after.png` | Start, seven question pages, Submit, and the same submitted state; scroll width 390 |

The final browser probes recorded no horizontal overflow. The service-level
restart test separately proves durable progress and post-restart submission;
the browser captures prove the authenticated Core3 UI path and responsive
submitted state.

## Odoo paired evidence

Authenticated Odoo desktop and mobile captures are
`odoo-authenticated-desktop-before.png` and
`odoo-authenticated-mobile-before.png`. Both show the valid Feedback Form but
stop at the host-controlled message: “The session will begin automatically
when the host starts.” No Odoo question/submit capture exists because the live
reference fixture did not expose a host-start action. This is recorded as the
exact blocker in `source-comparison.md`.

## Verification inventory

- Focused public response files: 4 passed, 0 failed, 50 assertions.
- Scoped ESLint: passed for `test/surveys_public_response.integration.test.ts`
  and `test/surveys_public_response_restart.integration.test.ts`.
- `git diff --check`: passed for the owned diff.
- Repository UI audit: passed with 673 pages, 682 routes, and 1,219
  datasources.
- Full repository regression: 1,430 passed / 4 unrelated concurrent
  eCommerce/CRM failures across 1,434 tests; no Surveys failure reproduced.
  No non-Surveys file was edited or staged to repair those failures.
- Full module/repository sign-off is intentionally not claimed from these
  focused tests and captures alone.
