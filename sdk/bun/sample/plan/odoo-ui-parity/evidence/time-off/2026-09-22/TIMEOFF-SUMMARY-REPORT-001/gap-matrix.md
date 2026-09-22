# Gap matrix

| Stable ID | Existing gap | Change | Verification |
| --- | --- | --- | --- |
| `TIMEOFF-SUMMARY-REPORT-001` | The Summary wizard only inserted an untyped intent; the installed QWeb-PDF report action, template, paper format, and output metadata were absent | Add migration `0.0.26`, report-run fields/history, deterministic 60-day derived measures, and `print_report` action metadata while preserving the existing wizard surface | Focused integration suite, migration replay/restart checks, and local Odoo source comparison |
