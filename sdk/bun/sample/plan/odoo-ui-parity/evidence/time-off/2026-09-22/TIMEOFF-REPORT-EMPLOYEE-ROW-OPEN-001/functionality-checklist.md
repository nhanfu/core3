# Functionality checklist

| Case | Result |
| --- | --- |
| `TIMEOFF-REPORT-EMPLOYEE-ROW-OPEN-001-FUNC` | pass — By Employee list rows declare open and double-click navigation to the existing request detail route |
| `TIMEOFF-REPORT-EMPLOYEE-ROW-OPEN-001-DATA` | pass — navigation carries `row.id`, the durable `leave_requests.id`; no duplicate storage or fixture was added |
| `TIMEOFF-REPORT-EMPLOYEE-ROW-OPEN-001-PERM` | pass — action and report datasource require `time_off.read`; existing detail page enforces the same read boundary |
| `TIMEOFF-REPORT-EMPLOYEE-ROW-OPEN-001-GUARD` | pass by reuse — existing detail datasource returns its declared not-found and transport-error states |
| `TIMEOFF-REPORT-EMPLOYEE-ROW-OPEN-001-RESPONSIVE` | blocked — shared authenticated Odoo tab was unavailable before desktop/mobile capture |
