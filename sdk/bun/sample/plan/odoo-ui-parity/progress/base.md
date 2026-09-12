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

- The contact attachment panel visibility gap is fixed in the current slice;
  upload persistence/download delivery still require QA follow-up.
- Odoo paired captures were not recaptured in this wave; this is not signed
  off as full visual parity.

## Attachment panel visibility slice (2026-09-13)

- Implemented declarative `attachment_panel_open` support and enabled it for
  the contact detail form.
- Authenticated Chromium: desktop/mobile panel, seeded attachment, and upload
  control rendered with zero page/request errors and no horizontal overflow.
- Real file upload did not complete before the browser runner timeout; upload
  persistence/download delivery remain open and no end-to-end claim is made.
- Focused evidence: client 31 tests; Base Contacts 5 tests / 61 assertions;
  audit 647/662/1112; frontend build; focused ESLint; diff check.

## QA review record — candidate `bb3487c2` / QA `1a404627` (2026-09-13)

- QA reproduced `BASE-ATTACH-001`: the real browser upload probe timed out,
  and upload persistence/download delivery remain blocked.
- Odoo paired comparison remains open; Base is not signed off.
