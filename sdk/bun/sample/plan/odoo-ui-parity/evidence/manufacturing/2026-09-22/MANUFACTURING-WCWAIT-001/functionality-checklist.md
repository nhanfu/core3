# Functionality checklist

| Case | Expected | Result |
| --- | --- | --- |
| Page/API separation | Presentation YAML contains no datasource/action definitions; API page id matches | PASS |
| Source modes | List, Form, Calendar, Pivot, Graph are visible tabs | PASS |
| Work Center scope | Assembly 2 returns only its waiting row; Assembly 1 returns none | PASS |
| Waiting guard | Ready filter cannot escape the fixed Waiting state | PASS |
| Search/filter | Search and Late filter apply to scoped durable rows | PASS |
| Empty state | `fixture_state=empty` returns no rows | PASS |
| Transport state | `fixture_state=transport_error` returns declared 503 envelope | PASS |
| Plan workflow | Waiting row exposes only permissioned Plan server action | PASS contract |
| Create/delete | No create or delete action is exposed | PASS |
| Restart | Row remains after file-backed close, reopen, and migration replay | PASS |
| Odoo desktop/mobile visual comparison | Capture paired authenticated source and Core3 states | BLOCKED by Odoo redirect |
