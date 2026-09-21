# Verification and blockers

## Odoo source and live reference

Local Odoo 19 source comparison passed for the generic CRM lead chatter and
`mail.thread` attachment contract. BrowserSkill daemon status was healthy on
browser instance `245ea108`. A fresh BrowserSkill session was started, and the
existing authenticated Odoo tab was identified, but borrowing it required the
extension's user confirmation. The command timed out after 20 seconds with
`confirmation_timeout`; the session was stopped cleanly.

No Odoo screenshot was captured, no Odoo database was mutated, and no visual
parity claim is made.

## Core3

The product contract and persistence checks passed in the focused test. A live
Core3 browser capture was not attempted after the Odoo borrow blocker because
the required paired authenticated comparison could not be established; no
Core3 screenshot is claimed.

## Open gates

- Authenticated Odoo and Core3 desktop/mobile captures at 1440x900 and
  390x844.
- Runtime upload through the real authenticated lead-detail UI, including image
  preview and download event capture.
- Full CRM regression, repository audit, frontend build, targeted lint, and
  final changed-file diff review.
