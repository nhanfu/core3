# Verification

## Odoo reference

- Desktop invoice detail capture: `/tmp/core3-odoo-parity/accounting-invoice-pdf-20260922-odoo-desktop.png`.
- Desktop Preview capture: `/tmp/core3-odoo-parity/accounting-invoice-preview-20260922-odoo-preview-desktop.png`.
- Mobile invoice detail capture: `/tmp/core3-odoo-parity/accounting-invoice-preview-20260922-odoo-mobile.png` (390x844 emulation; Preview exposed in overflow as `Preview`).
- Mobile Preview capture: `/tmp/core3-odoo-parity/accounting-invoice-preview-20260922-odoo-preview-mobile.png`; the bsk observation remained 390x844 and showed the portal invoice iframe, Back to edit mode, Pay Now, Download and Communication history.

## Core3

- Runtime route catalog was available: `curl -i http://127.0.0.1:4013/api/modules` returned HTTP 200 and included `invoice-preview` at `/accounting/invoice-preview`.
- Authenticated UI capture is blocked: a fresh bsk tab on the same browser instance redirected directly to `/auth/login` with no pre-existing Core3 login session. Credentials were not entered or printed. Therefore no Core3 screenshot or visual-parity claim is made.
- The runner startup succeeded; no Core3 browser state is marked pass without authenticated evidence.
