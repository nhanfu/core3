# Test results

Focused command:

```text
bun test ./test/inventory_moves_analysis.integration.test.ts --timeout 30000
4 pass, 0 fail, 41 assertions
```

The test covers page/API separation, source menu/action, deterministic data,
state/type/date/search filters, pivot totals, empty/404/503 states, read-only
permission boundaries, and file-backed restart persistence.

The normal shared runner currently fails before serving any module because an
unrelated committed Surveys page has `actions[0].fields`, which violates the
shared YAML schema. Inventory did not alter that boundary; browser evidence
was captured in an isolated Auth/Chat/Inventory runtime.
