# Verification

## Odoo reference

Authenticated bsk session on browser instance `245ea108` reached
`http://localhost:8069/odoo` and showed Discuss. The app launcher had no Email
Marketing entry, so `mass_mailing.mailing` and its Duplicate form were not
reachable in the requested `core3_reference` database. No Odoo visual parity
claim is made. Reference blocker capture:

`/tmp/odoo-email-marketing-duplicate-reference-blocker-desktop-20260922.png`

## Core3 browser attempt

The isolated module runtime was available at `http://localhost:4385`, but the
browser session landed on the Core3 sign-in page. The local QA credentials were
already prefilled; the browser-skill human-help request to click Sign in stayed
pending, so the session could not reach the authenticated mailing detail page.
No authenticated Core3 screenshot, mutation, page-error, request-failure, or
responsive visual claim is recorded.

The bsk cleanup command was issued with `bsk session stop --all`. The daemon
reported the help-blocked session `escs` could not be stopped because it had an
unfinished help command; no further browser sessions were created. This is an
environment cleanup limitation, not a product result.
