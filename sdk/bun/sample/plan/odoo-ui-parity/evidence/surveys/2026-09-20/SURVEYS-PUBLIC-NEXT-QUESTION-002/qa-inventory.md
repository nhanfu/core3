# QA inventory

| Area | Evidence | Result |
| --- | --- | --- |
| Caller ownership | `public/app.ts:312-325`, `public/components/PublicSurvey.ts` | pass |
| API/page separation | `services/surveys/api/surveys.yaml`, `operations.yaml` | pass |
| Durable workflow | `test/surveys_public_next_question.integration.test.ts` | pass |
| Restart/idempotency | focused service test plus browser reload/replay | pass |
| Core3 desktop/mobile | `core3-*.png`, `core3-browser-results.json` | pass |
| Odoo comparison | `source-comparison.md`, `odoo-browser-results.json` | conditional: fixture unavailable |

No full repository regression was run for this bounded finalization.
