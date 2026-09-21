# QA inventory

| Claim/control | Functional check | Visual/evidence state | Result |
| --- | --- | --- | --- |
| Odoo timer metadata is durable | Paired page/API contract exposes `question_started_at`, `is_time_limited`, and `time_limit` | Timed current-question attendee state | pass in focused integration test |
| Timer is rendered by the live attendee route | Renderer contains timer markup and expiry disable state | Desktop and mobile attendee route at `/s/5177` | blocked: Core3 service host unavailable |
| Expiry is server authoritative | Expired answer returns 409 and leaves answer/counters unchanged | Late-answer path | pass in focused integration test |
| Valid answer lifecycle | Move start timestamp into future, submit, persist answer | Current timed question | pass in focused integration test |
| Restart/idempotency | Reopen file-backed DuckDB and replay with a different value | Restored attendee/current question | pass in focused integration test |
| Permission/token boundary | Existing `surveys.public` action and attendee token guards precede timer guard | Unauthorized attendee path | pass by contract and route tests |
| Odoo comparison | Authenticated desktop/mobile route and installed Surveys screen | `/odoo/surveys` | blocked: login shell only; port 8072 refused |

Exploratory cases included expired submission (no mutation) and replay after
restart with a changed answer value (original durable answer returned).
