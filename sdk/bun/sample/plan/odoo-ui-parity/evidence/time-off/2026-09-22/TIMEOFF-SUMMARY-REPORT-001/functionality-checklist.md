# Functionality checklist

| Case | Result |
| --- | --- |
| `TIMEOFF-SUMMARY-REPORT-001-SOURCE` | pass — Odoo report action/template/paper-format IDs and 60-day template contract are asserted from local source |
| `TIMEOFF-SUMMARY-REPORT-001-CONTRACT` | pass — Summary page/API join, read permission, `print_report` operation, and report history datasource are declared |
| `TIMEOFF-SUMMARY-REPORT-001-DATA` | pass — stable run IDs, filename, date range, leave count, total days, actor, and PDF metadata persist |
| `TIMEOFF-SUMMARY-REPORT-001-GUARD` | pass — missing employee, invalid year/type, and report-derivation guards remain deterministic |
| `TIMEOFF-SUMMARY-REPORT-001-RESTART` | pass — migration replay and file-backed close/reopen retain report history |
| `TIMEOFF-SUMMARY-REPORT-001-RESPONSIVE` | blocked — authenticated Odoo tab was unavailable and Core3 task tab had no auth session |
