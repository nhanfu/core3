# SURVEYS-LIVE-LEADERBOARD-001 QA inventory

## Automated verification

- Focused feature: `bun test ./test/surveys_live_results.integration.test.ts
  --timeout 20000` — 3 passed, 25 assertions.
- Full Surveys: `bun test ./test/surveys*.integration.test.ts
  --timeout 20000` — 55 passed, 0 failed, 436 assertions across 11 files.
- Full repository regression: `bun test --timeout 20000` — 1,453 passed,
  10 failed, 13,104 assertions across 1,463 tests. The failures are outside
  Surveys: two CRM fixture-order expectations and eight unrelated page-schema
  discovery failures caused by unsupported `components[1].title` keys.
- Browser runtime audit: the normal shared runtime hit a pre-existing,
  non-Surveys schema error in `services/project/pages/project-dashboard.yaml`
  and `services/employees/pages/{directory,employees}.yaml` (`empty_state`
  action keys). No other-owner files were changed. Authenticated evidence was
  captured on an isolated runtime containing only the required auth/chat/AI/
  Surveys roots.
- Authenticated Core3 desktop/mobile: session manager → Start → Leaderboard;
  both viewports showed two durable rows, one host navigation action, and no
  document overflow.
- Authenticated Odoo desktop/mobile: session manager loaded at both viewports;
  `/survey/session/leaderboard/<token>` returned an exact empty result because
  the active reference fixture has no attendee attempts and disables the
  leaderboard.

## Browser matrix

| Runtime | Viewport | Result |
| --- | --- | --- |
| Core3 Admin | 1440x1000 | Start session, Leaderboard action, Nora 100 / Omar 60, overflow false |
| Core3 Admin | 390x844 | Same durable rows and action, overflow false |
| Odoo authenticated | 1440x1000 | Session manager rendered, leaderboard JSON-RPC result empty |
| Odoo authenticated | 390x844 | Session manager rendered, leaderboard JSON-RPC result empty |

The slice remains conditional because the Odoo reference lacks live attendee
fixture data for a row-by-row leaderboard comparison.
