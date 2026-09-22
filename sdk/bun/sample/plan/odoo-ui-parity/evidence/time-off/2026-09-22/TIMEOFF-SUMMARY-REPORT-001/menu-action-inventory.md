# Menu/action inventory

| Menu/context | Odoo action | Core3 contract | Result |
| --- | --- | --- | --- |
| Employees > Actions > Print > Time Off Summary | `action_hr_holidays_summary_employee` | By Employee `print_time_off_summary` server form | existing wizard retained |
| Summary wizard Print | `print_report` -> `action_report_holidayssummary` | `time_off.summary.print`, `operation: print_report` | implemented |
| Report output | `action_report_holidayssummary` / `hr_holidays.report_holidayssummary` | `time_off_summary_runs` with PDF/template/paper-format metadata | implemented |
