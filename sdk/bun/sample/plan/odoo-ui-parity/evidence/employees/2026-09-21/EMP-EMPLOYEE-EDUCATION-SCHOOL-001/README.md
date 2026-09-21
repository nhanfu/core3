# EMP-EMPLOYEE-EDUCATION-SCHOOL-001 evidence

## Core3

- Authenticated with the local admin session (`POST /api/auth/login`, HTTP 200).
- Desktop (`1440x900`) and mobile (`390x844`) opened `/employees/detail?id=employee-demo-001`, selected Personal, and rendered the Education group with Certificate Level, Field of Study, and School.
- Both sessions had zero failed browser requests. The deterministic `Core3 Vietnam` employee values were empty in the authenticated `Core3 Demo Company` context, so this is UI/route evidence rather than a fixture-value sign-off.
- Captures: `core3-desktop-personal.png`, `core3-mobile-personal.png`, `core3-browser.json`.

## Odoo comparison

- Desktop and mobile reached `/web/login`, but `admin/admin` was rejected on desktop and the mobile retry returned Odoo's rate-limit message.
- The checked-in Odoo model defines `study_school`, but the current `hr_employee_views.xml` Education group renders only Certificate Level and Field of Study; this is an exact source-view discrepancy in addition to the unavailable login.
- No authenticated Odoo Education capture is claimed. Captures and exact response text are in `odoo-browser.json`, `odoo-desktop.png`, and `odoo-mobile.png`.

No aggregate Employees sign-off is claimed.
