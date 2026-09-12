# Base module QA ledger

Status: `ready-for-test`
Assigned QA: `QA-1`
QA mode: dispatchable bounded task; activate on feature-complete,
merge-candidate, post-merge, refactor-impact, or release.
Verification trigger: `feature-complete`
Candidate commit: `bb3487c2`
Runtime: `bun run agent:module -- base --port=4010`

## Coverage

- [x] YAML page/API ownership, menus, routes, deterministic fixtures, search,
  archive, empty, and error states.
- [x] Base configuration CRUD, validation, and optimistic concurrency tests.
- [x] Contact detail activity, chatter, stat buttons, and authenticated render.
- [x] Contact attachment table and guarded upload/download API contract.
- [ ] Authenticated attachment upload/download journey; attachment panel is
      not currently visible in the shared renderer.
- [ ] Fresh paired Odoo visual comparison for this candidate.

## Decision

`pending-qa`: implementation is testable, but attachment renderer coverage
and paired Odoo comparison remain open. Authenticated evidence includes the
mobile list and desktop/mobile detail; the desktop list capture is excluded
because its run had a transient `/api/apps` failure.

## QA result: attachment panel candidate `bb3487c2` (2026-09-13)

- Candidate branch: `agent/base-contact-attachments-qa`
- Authenticated route: `/base/contacts/detail?id=contact-demo`, credentials
  `admin@tms.local / admin123`, single-module server `http://127.0.0.1:4010`.
- Desktop 1440x900 and mobile 390x844: attachment panel open, seeded
  `contact-brief.txt`, and `Add attachment` visible; zero console errors or
  failed requests; body/document width equals viewport at both sizes.
- Captures (outside Git): `/tmp/core3-base-contact-attachments-qa-desktop.png`
  (SHA-256 `187f4505dbd8b08ac0b7d251120c714d9c71a2d3cafca47d49ab1ffa8604d66a`)
  and `/tmp/core3-base-contact-attachments-qa-mobile.png` (SHA-256
  `ca285314337ebb16d3c8bf6ea366ee718c88eaa4a52e81a4a61a467bd5e797d0`).
- Focused tests pass: `bun test ./test/base_contacts.integration.test.ts` —
  5 tests / 61 assertions; client `document-components.test.ts` — 31 tests.
  `bun run audit` passes at 647 pages / 662 routes / 1112 datasources;
  `bun run frontend:build` and `bun run lint` pass; `git diff --check` passes.
- Permission check: unauthenticated `GET /api/pages/contact-detail` returns
  401 `UNAUTHORIZED`; focused Base Contacts permission assertions pass for
  `base.contacts.read`, `base.contacts.write`, and `base.contacts.manage`.
- Finding/blocker `BASE-ATTACH-001`: authenticated file selection of
  `qa-contact-upload.txt` does not persist. The upload status becomes
  `No action handler registered for action: upload_contact_attachment`; the
  attachment list remains only `contact-brief.txt` after reload. The seeded
  download control emits no browser download and no API request. The YAML
  action contract exists, but the runtime action handler is not registered.
- Explicit probe timeout: the initial real-browser upload probe exceeded its
  30-second runner limit and was stopped; it produced no completed upload
  response. A later bounded probe reproduced the handler error above. No
  browser, upload probe, or port-4010 server process remains running.
- Odoo paired comparison remains open. This candidate is not signed off;
  upload persistence and download delivery are blocking gaps.

## DEV retest: `BASE-ATTACH-001` (2026-09-13)

- New candidate branch: `agent/base-contact-attachments-qa`.
- Base storage registration and renderer action dispatch now cover the
  declared `base_contact_attachment` upload/download kind while preserving
  `base.contacts.write` upload and `base.contacts.read` download permissions.
- Authenticated browser retest: upload `qa-contact-2.txt` returned HTTP 200 and
  appeared in the attachment list; seeded `contact-brief.txt` downloaded as
  `contact-brief.txt`. Desktop/mobile panel renders had zero errors and no
  horizontal overflow.
- Focused evidence: Base Contacts 5 tests / 62 assertions; client document
  components 33 tests; audit 647 pages / 662 routes / 1112 datasources;
  frontend build, ESLint, and `git diff --check` pass.
- `BASE-ATTACH-001`: resolved for upload/download persistence and delivery.
  Fresh Odoo paired visual comparison remains open; no full module sign-off
  is claimed.
