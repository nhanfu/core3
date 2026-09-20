# QA inventory

| Area | Evidence | Result |
| --- | --- | --- |
| YAML/API ownership | `services/surveys/api/surveys.yaml`, `operations.yaml` | pass |
| Durable migration | `20260920230000-022-survey-public-navigation.yaml` | pass |
| CRUD/workflow/guards | `test/surveys_public_next_question.integration.test.ts` | pass |
| Restart/idempotency | same test plus `test/surveys_migrations.integration.test.ts` | pass |
| Core3 desktop | `core3-desktop-{before,after}.png` and JSON | API pass; renderer blocker recorded |
| Core3 mobile | `core3-mobile-{before,after}.png` and JSON | API pass; renderer blocker recorded |
| Odoo comparison | `odoo-browser-results.json`, `source-comparison.md` | conditional: no active answer fixture |

The Core3 browser JSON records zero failed requests and no horizontal overflow
at 1440x900 and 390x844. No Odoo visual or mutation sign-off is claimed.
