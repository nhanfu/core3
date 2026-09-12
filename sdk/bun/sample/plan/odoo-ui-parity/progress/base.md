# Base module progress

Status: `ready-for-qa`

Owner: `agent/odoo-owner-base-wave1`
QA owner: `QA-1` (dispatchable)
Verification trigger: `feature-complete`
Candidate commit: `ecf1880f`

## Evidence

- `bun test ./test/base_*.integration.test.ts` — 29 tests / 295 assertions pass.
- `bun run audit` — pass: 647 pages, 662 routes, 1112 datasources.
- `bun run frontend:build` — pass.
- `git diff --check` — pass.
- Base contact duplicate-email guard was corrected to use `NOT EXISTS`; CRM's
  isolated cross-service conversion test now creates and links a Base contact
  through the registered YAML service.
- Authenticated Chromium rendered the Contacts list on mobile and contact
  detail on desktop/mobile — pass; those runs had no page/request errors or
  horizontal overflow. A desktop list route also rendered earlier, but its
  run included a transient `/api/apps` failure and is not sign-off evidence.
- Captures: `/tmp/core3-base-wave1-contacts-mobile-verified.png`,
  `/tmp/core3-base-wave1-contact-detail-desktop-auth.png`,
  `/tmp/core3-base-wave1-contact-detail-mobile-auth.png`.

## Remaining blockers

- The shared `OdooFormView` does not visibly render the contact attachment
  panel; renderer-level attachment QA remains open.
- Odoo paired captures were not recaptured in this wave; this is not signed
  off as full visual parity.
