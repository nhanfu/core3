# Source comparison

| Odoo | Core3 |
| --- | --- |
| `action_hr_holidays_summary_employee` opens `Time Off Summary` from an employee context | Existing By Employee `print_time_off_summary` server form remains the page action and keeps its Odoo labels/defaults |
| Wizard `print_report` calls `action_report_holidayssummary` | The YAML mutation uses `operation: print_report` and records `hr_holidays.action_report_holidayssummary` |
| `qweb-pdf` report name is `hr_holidays.report_holidayssummary` | `report_template` and `output_format: PDF` are durable report-run fields |
| Paper format is `paperformat_hrsummary` | The same paper-format ID is persisted in `time_off_summary_runs` |
| Report covers 60 days from `date_from` and summarizes matching leave | Core3 derives `date_to`, `leave_count`, and `total_days` from fixed 2026 leave fixtures |
| Employee report action is read-bound through the employee context | Form, report history datasource, and all existing date/type guards require `time_off.read` |
