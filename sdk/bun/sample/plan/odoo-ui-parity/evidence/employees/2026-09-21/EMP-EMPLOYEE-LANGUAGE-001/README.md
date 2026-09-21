# EMP-EMPLOYEE-LANGUAGE-001 evidence

## Core3

- Authenticated with the local admin session (`POST /api/auth/login`, HTTP 200).
- Desktop (`1440x900`) and mobile (`390x844`) opened `/employees/detail?id=employee-demo-001`, selected the Settings tab, and rendered User and attendance → Language.
- Both sessions had zero failed browser requests. The deterministic `Core3 Vietnam` values were empty in the authenticated `Core3 Demo Company` context, so this proves route/rendering and not fixture-value alignment.
- Captures: `core3-desktop.png`, `core3-mobile.png`, and `core3-browser.json`.

## Odoo comparison

- The checked-in Odoo source defines `hr.employee.lang` and the HR profile test includes the `lang` field.
- Desktop and mobile login attempts at `/web/login` used `admin/admin`; desktop returned Wrong login/password and the mobile retry returned Odoo's rate-limit message.
- No authenticated Odoo Employee Language capture is claimed. Exact response text and captures are in `odoo-browser.json`, `odoo-desktop.png`, and `odoo-mobile.png`.

No aggregate Employees sign-off is claimed.
