# Source comparison

| Behavior | Odoo 19 source | Core3 implementation |
| --- | --- | --- |
| Retry route | `addons/survey/controllers/main.py:167-191`, `survey_retry` accepts survey and answer tokens, validates access, creates a new answer, and redirects to `/survey/start/<survey_token>?answer_token=<new token>` | `services/surveys/module.ts`, `POST /api/public/surveys/<survey_token>/retry` validates the published survey and submitted source response, then returns a deterministic `start_url` |
| Retry answer | `survey_survey._create_answer` receives the source partner/email/invite/test context and `_prepare_retry_additional_values` preserves deadline/nickname | `services/surveys/api/surveys.yaml` inserts a new `survey_responses` row with respondent name/email and test-entry context preserved; answer data resets to `{}` |
| Public/security seam | Odoo route is `auth='public'` but requires a valid source answer token | YAML action `public_survey_retry` declares `permission: surveys.public`; source token is scoped to the target published survey and must be `Submitted` |
| Replay/durability | Odoo creates a new attempt on a valid retry request | Core3 accepts an optional idempotency key, returns the same retry row on replay, derives stable retry IDs/tokens, and verifies the row after file-backed DuckDB reopen |

The Core3 public route is intentionally API-first; the existing public print
surface can render the completed source and the new `/survey/start/...` URL.
