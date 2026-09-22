# Test results

- bun test ./test/project_share_project.integration.test.ts --timeout 30000
  — 3 passed, 0 failed, 17 assertions.
- bun test ./test/project*.integration.test.ts --timeout 30000 — broad run
  reached Project tests, but discovery-backed cases were blocked by the
  unrelated pre-existing duplicate datasource inventory_reordering_rule_products
  in services/inventory/pages/reordering-rules.yaml; Project mutation/query
  cases continued to pass.
- BrowserSkill live capture — blocked by shared tab ownership/confirmation;
  no screenshots are included.
