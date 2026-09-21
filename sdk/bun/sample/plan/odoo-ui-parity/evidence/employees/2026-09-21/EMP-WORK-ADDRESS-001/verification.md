# Verification

- Odoo authenticated desktop: pass, `/odoo/employees/6`, Work tab, Work Address and address text visible at 1440x900; `odoo-desktop.png`.
- Odoo authenticated mobile: pass, `/odoo/employees/6`, Work tab, Work Address and address text visible at 390x844; `odoo-mobile.png`.
- Core3 bounded runtime: blocked before HTTP startup. `bun dev --db=ddb --memory` reached Vite readiness, then failed page discovery on an unrelated concurrent page schema error: `components[3].title is not allowed`. Port 3001 returned HTTP 000. The exact Vite child from this attempt was stopped afterward; Employees did not alter the unrelated page.
- Focused repository tests exercise the Employee Work Address API/action and durable migration directly; they do not substitute for browser sign-off.

No aggregate Employees sign-off is claimed.
