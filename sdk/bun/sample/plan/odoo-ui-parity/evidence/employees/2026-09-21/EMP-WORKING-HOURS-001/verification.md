# Verification

- Odoo authenticated desktop: pass, `/odoo/employees/6`, Payroll tab, `Working Hours` label visible at 1440x900; `odoo-desktop.png`.
- Odoo authenticated mobile: pass, `/odoo/employees/6`, Payroll tab, `Working Hours` label visible at 390x844; `odoo-mobile.png`.
- Core3 bounded runtime: blocked for browser capture. `bun dev --db=ddb --memory` printed the expected backend URL and Vite became ready on 3002, but port 3001 returned HTTP 000 for 12 seconds and the bounded process exited with SIGTERM. The exact Vite child from this attempt was stopped afterward.
- The deterministic Core3 fixtures are `Core3 Vietnam`; the known authenticated browser company is not used as a sign-off substitute when the backend cannot bind.

No aggregate Employees sign-off is claimed.
