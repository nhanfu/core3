# Source comparison

| Odoo behavior | Core3 before | Core3 in this slice | Result |
| --- | --- | --- | --- |
| `is_time_limited` and `time_limit` persisted on `survey.survey` | Durable columns existed only for public timer behavior; no authenticated edit contract | `survey_detail` projects both fields and the detail Time & Scoring group displays them | Implemented |
| Options form checkbox plus float-time minutes field | No authenticated configuration action | `update_survey_time_limit` server form exposes `Survey Time Limit` and `Time limit (minutes)` | Implemented |
| Positive duration required when enabled | Public expiry guard existed; no authenticated mutation validation | YAML mutation returns `SURVEY_TIME_LIMIT_INVALID` (422) before writes | Implemented |
| Write/actor and optimistic state boundary | No authenticated time-limit write path | `surveys.write`, actor, missing, archived/stale guards | Implemented |
| Public timer consumption | Existing `survey.public.detail` and public route already consume timer values | Contract retained and restart-tested through the same operation | Regression-covered |
| Desktop/mobile visual parity | No Core3 capture possible | Odoo references captured; Core3 runtime unavailable | Conditional/blocker |
