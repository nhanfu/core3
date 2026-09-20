# Verification

- Odoo authenticated desktop: pass, `/odoo/employees/6`, Work tab, `Work Location` visible at 1440x900; `odoo-desktop.png`.
- Odoo authenticated mobile: pass, `/odoo/employees/6`, Work tab, `Work Location` visible at 390x844; `odoo-mobile.png`.
- Core3 bounded runtime: blocked for browser capture. `bun dev --db=ddb --memory` printed the backend URL and Vite became ready on 3002, but port 3001 returned HTTP 000 for 12 seconds and the bounded process exited with code 143. The exact Vite child from this attempt was stopped afterward.
- The deterministic Core3 fixture is `Core3 Vietnam`; no unavailable runtime or different authenticated company was used as a substitute for Core3 browser sign-off.

No aggregate Employees sign-off is claimed.
