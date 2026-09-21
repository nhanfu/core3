# Verification

## Authenticated Odoo

The required bsk session used browser instance `245ea108`, navigated through
the Events menu to Reporting > Attendees, opened the Samar Basra registration,
and observed the Questions table with Add a line at desktop and mobile.

| Viewport | Capture | SHA-256 |
| --- | --- | --- |
| desktop 1916x833 | `/tmp/core3-odoo-parity/events-attendee-answers-20260921/odoo-desktop.png` | `292abb6da7e3a3a99a8518fcc4a30297fdd81c57c20328cc86839d80c5a65b7e` |
| mobile 390x844 | `/tmp/core3-odoo-parity/events-attendee-answers-20260921/odoo-mobile.png` | `dcb8ee2e9927bc14ac2f58445b778900a8e5891cf47aebfef2882c03b6b04263` |

The bsk session was stopped cleanly after capture.

## Core3

No authenticated Core3 capture is claimed in this checkpoint. The prior
`discoverPages()` CRM error is not reproducible in the current tree: direct
discovery reports one owner for `crm_lead_mining_request_detail`, Core3 startup
reaches Vite, and the CRM focused test passes. The Core3 desktop/mobile visual
check remains a follow-up rather than a parity claim.
