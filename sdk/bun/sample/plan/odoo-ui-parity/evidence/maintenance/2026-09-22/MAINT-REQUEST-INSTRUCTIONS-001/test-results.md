# Test results

- Focused: `bun test test/maintenance_request_instructions.integration.test.ts --timeout 30000` — **4 passed, 0 failed, 20 expect() calls**.
- Request-focused regression: `bun test test/maintenance_request_*.integration.test.ts test/maintenance_analysis_reporting.integration.test.ts test/maintenance_team_dashboard*.integration.test.ts --timeout 30000` — **36 passed, 0 failed, 220 expect() calls**.
- The full Maintenance glob reached **54 passed / 6 failed** before the
  contract-test updates; the remaining failures are discovery-dependent tests
  blocked by the unrelated concurrent Inventory page
  `services/inventory/pages/product-template-detail.yaml` with
  `components[0].stat_buttons[5].value_field` empty. No Inventory file was
  changed.
