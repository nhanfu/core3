# SURVEYS-LIVE-SESSION-JOIN-001 QA inventory

## Automated verification

- Focused feature: `bun test ./test/surveys_live_session_join.integration.test.ts
  --timeout 20000` — **3 passed, 25 assertions**.
- Full Surveys module: `bun test $(rg --files test | rg
  '(^|/)surveys.*integration\\.test\\.ts$') --timeout 20000` — **58 passed,
  0 failed, 461 assertions across 12 files**.
- The migration rollback regression covers the new 0.0.20 dependent-index
  teardown and replay; its four tests pass.
- Authenticated Core3 desktop/mobile CDP evidence: isolated runtime
  `http://127.0.0.1:4016`, 1440x1000 and 390x844, both joined the in-progress
  session and returned HTTP 200 with durable attendee tokens; overflow is
  false in `core3-browser-results.json`.
- Authenticated Odoo desktop/mobile CDP evidence: `127.0.0.1:8069`, route
  `/s/5822`, both rendered the access-code form without overflow. The exact
  JSON-RPC check returned `{\"error\":\"survey_wrong\"}` because the reference
  database has no matching live session.

## Evidence files

| Runtime | Desktop | Mobile | Exact result |
| --- | --- | --- | --- |
| Core3 Admin | `core3-authenticated-desktop-session-join-{before,after}.png` | `core3-authenticated-mobile-session-join-{before,after}.png` | `core3-browser-results.json` |
| Odoo authenticated | `odoo-authenticated-desktop-session-code.png` | `odoo-authenticated-mobile-session-code.png` | `odoo-browser-results.json` |

Disposition: Core3 persistence, public permission boundary, Ready/Waiting and
In Progress/rejoin workflow, restart coverage, and responsive authenticated
evidence pass for this bounded slice. Odoo comparison is conditional on a
reference session code; no full Surveys module sign-off is claimed.

## Repository regression and scoped checks

- Full repository: **1,480 passed, 2 failed, 13,308 assertions** across 1,482
  tests. Both failures are concurrent CRM fixture-order expectations in
  `crm_leads_analysis.integration.test.ts` and `crm_forecast.integration.test.ts`;
  no Surveys test failed.
- `bunx eslint test/surveys*.ts` — passed.
- `git diff --check` — passed.
- `bun run audit` — passed: 679 pages, 688 routes, 1,247 datasources.
