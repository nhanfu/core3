# Gap matrix

| Gap before this slice | Resolution | Evidence |
| --- | --- | --- |
| stock.action_orderpoint had no Core3 page/API contract | Added separate list/detail page and API YAML | pages/reordering-rules.yaml, api/reordering-rules.yaml |
| Replenishment and Reordering Rules were conflated | Reused the orderpoint table but gave the action its own automatic default and filters | api/reordering-rules.yaml |
| No orderpoint CRUD lifecycle on the action surface | Added create, edit, archive, restore, and guarded delete | api/reordering-rule-detail.yaml |
| No archived fixture or action-surface index | Added idempotent migration 0.0.90 | migrations/20260923000000-090-inventory-reordering-rules.yaml |
| No stable regression coverage | Added 4-test/29-assertion integration suite | test-results.md |
| Live visual comparison unavailable | Exact shared-tab ownership blocker recorded; no visual claim | browser-blocker.md |
