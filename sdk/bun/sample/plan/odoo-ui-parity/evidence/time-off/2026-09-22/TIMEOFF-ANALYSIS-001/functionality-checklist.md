# Functionality checklist

| Case | Type | Expected | Result |
| --- | --- | --- | --- |
| TIMEOFF-ANALYSIS-001-CONTRACT | functional | Stable route and matching page/API `page.id`; Graph and Pivot tabs | PASS |
| TIMEOFF-ANALYSIS-001-SIGNED | data | Durable allocations are positive and leave requests negative for days/hours | PASS |
| TIMEOFF-ANALYSIS-001-FILTER | functional | Search, status, request type, employee, department, and date filters scope the report | PASS |
| TIMEOFF-ANALYSIS-001-EMPTY | functional | `fixture_state=empty` returns an empty report without fake rows | PASS |
| TIMEOFF-ANALYSIS-001-ERROR | error | Datasource declares deterministic HTTP 503 transport state | PASS |
| TIMEOFF-ANALYSIS-001-MIGRATION | data | Department/company metadata and analysis indexes replay idempotently | PASS |
| TIMEOFF-ANALYSIS-001-PERM | permission | Every report/options datasource requires `time_off.read`; no mutation actions exist | PASS |
| TIMEOFF-ANALYSIS-001-DESKTOP | visual | Authenticated Odoo/Core3 report at desktop viewport | BLOCKED; Odoo route is Discuss and Core3 tab is 401 |
| TIMEOFF-ANALYSIS-001-MOBILE | responsive | Authenticated Odoo/Core3 report at mobile viewport | BLOCKED; Odoo route is Discuss and Core3 tab is 401 |
