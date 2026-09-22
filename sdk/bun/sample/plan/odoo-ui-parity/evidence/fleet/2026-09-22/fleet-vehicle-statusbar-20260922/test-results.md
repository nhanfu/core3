# Test results

- `bun test test/fleet_vehicle_statusbar.integration.test.ts --timeout 20000`
  — **2 passed, 17 assertions**.
- The focused test covers source mapping, page/API separation, all four
  status actions, durable persistence, stale replay, invalid status, and
  company scope.
- Browser visual verification was not run because BrowserSkill tab borrowing
  timed out before the authenticated Odoo tab was readable.
