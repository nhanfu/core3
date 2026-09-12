# Base module progress

Status: `ready-for-qa`

Owner: `agent/odoo-owner-base-wave1`
QA owner: `QA-1` (dispatchable)
Verification trigger: `feature-complete`
Candidate commit: `bb3487c2`

## Evidence

- `bun test ./test/base_*.integration.test.ts` — 29 tests / 295 assertions pass.
- `bun run audit` — pass: 647 pages, 662 routes, 1112 datasources.
- `bun run frontend:build` — pass.
- `git diff --check` — pass.
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

## BASE-ATTACH-001 resolution (2026-09-13)

- Registered Base local file storage and the
  `/api/base/contacts/attachments/:attachment_id` download route.
- Registered renderer dispatch for declared upload/download actions and
  propagated the page action handler through form Chatter children.
- Authenticated browser verified upload HTTP 200, persisted attachment listing,
  seeded-file download, desktop/mobile rendering, zero errors, and no
  horizontal overflow.
- The prior timeout/handler blocker is resolved; fresh Odoo paired comparison
  remains open.

## QA result for candidate `bb3487c2` (2026-09-13)

- Authenticated Chromium checks at 1440x900 and 390x844 passed for
  `/base/contacts/detail?id=contact-demo`: the attachment panel is open,
  `contact-brief.txt` and Add attachment are visible, there are no console or
  failed-request errors, and there is no horizontal overflow. Captures remain
  outside Git at `/tmp/core3-base-contact-attachments-qa-desktop.png` and
  `/tmp/core3-base-contact-attachments-qa-mobile.png`.
- Contract/build evidence passed: Base Contacts 5 tests / 61 assertions;
  client document components 31 tests; audit 647 pages / 662 routes /
  1112 datasources; frontend build; full ESLint; `git diff --check`.
- Permission boundary evidence: unauthenticated contact-detail API returns
  401 `UNAUTHORIZED`; YAML permission assertions pass for attachment read and
  write actions.
- Blocking finding `BASE-ATTACH-001`: browser upload selection reports
  `No action handler registered for action: upload_contact_attachment`, does
  not add `qa-contact-upload.txt`, and does not survive reload. Clicking the
  seeded download control produces no download or API request. The candidate
  remains `pending-qa`; do not claim attachment upload/download sign-off.
- Explicit probe timeout: the initial browser upload probe exceeded the
  30-second runner limit and was stopped before completion; the subsequent
  bounded probe reproduced `BASE-ATTACH-001`. No hanging browser, upload
  probe, or port-4010 server remains.
