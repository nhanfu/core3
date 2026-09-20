# Verification

## QA inventory

| Requirement or control | Functional check | Visual evidence |
| --- | --- | --- |
| Settings → Attendance/Point of Sale → PIN Code | Authenticated Core3 and Odoo desktop/mobile loads; Settings tab opened | Four viewport captures |
| Create/edit/clear PIN contract | Focused DuckDB CRUD and validation test | API contract and test result |
| Actor/company/concurrency boundaries | Empty actor, stale row, wrong company, and non-digit requests reject atomically | Test result and conditional UI blocker |
| Durable fixtures | Migration replay and file-backed restart retain PIN values | Test result |
| Responsive initial view | `scrollWidth == clientWidth` at 1440x900 and 390x844 | Four captures plus browser.json |

Exploratory checks included empty reference PIN state and the Core3 fixture/
session company mismatch. No page errors, failed requests, HTTP errors, or
horizontal overflow were observed.

## Results

- `bun test test/employees_attendance_pin.integration.test.ts`: 4 tests,
  20 assertions passed.
- Authenticated Core3/Odoo desktop and mobile captures: conditional pass;
  visible control and viewport checks pass, but populated values are blocked
  by the deterministic Core3 company mismatch and empty Odoo reference value.
- No aggregate Employees sign-off is claimed.
