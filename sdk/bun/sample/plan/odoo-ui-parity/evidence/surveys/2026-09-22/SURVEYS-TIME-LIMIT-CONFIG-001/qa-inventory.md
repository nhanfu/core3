# QA inventory

- Feature: `SURVEYS-TIME-LIMIT-CONFIG-001`
- Odoo menu/action: Surveys → survey form → Options → Time & Scoring
- Odoo route/database: `/odoo/surveys/2`, `core3_reference`
- Core3 intended route: `/surveys/detail?id=survey-demo-public-timer`
- Page/API join: `survey-detail`
- Permissions: `surveys.read` for detail; `surveys.write` plus actor for update
- Persistence: existing `surveys.is_time_limited` and `surveys.time_limit`
- Workflow guards: 404 missing, 403 actor, 409 archived/stale, 422 enabled
  non-positive/non-numeric duration
- Restart: file-backed DuckDB migration replay and readback passed
- Visual: Odoo reference captured; Core3 visual evidence blocked by shared
page-discovery failure, so this feature is not visually signed off.
