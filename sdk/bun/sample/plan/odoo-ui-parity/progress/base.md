# Base module progress

Status: `ready-for-qa`

Owner: `agent/odoo-owner-base-wave1`
QA owner: `QA-1` (dispatchable)
Verification trigger: `feature-complete`
Candidate commit: `8fdf7be3`

## Evidence

## QA-pending candidate `a1644b7c` (2026-09-13)

Existing Base owner candidate is queued for the existing QA owner; no merge was
performed. Coordinator focused evidence is **6/68**, audit **647/662/1,114**;
candidate build/lint/diff-check confirmation, browser attachment upload/download,
restart, actor, and paired Odoo gates remain open.

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

## BASE-ATTACH-001 retest (2026-09-13)

- Registered Base local file storage and the
  `/api/base/contacts/attachments/:attachment_id` download route.
- Registered renderer dispatch for declared upload/download actions and
  propagated the page action handler through form Chatter children.
- Authenticated browser verified upload HTTP 200, persisted attachment listing,
  seeded-file download, desktop/mobile rendering, zero errors, and no
  horizontal overflow.
- Direct API/storage retest passed, but the bounded browser capture still
  timed out during hidden file-input interaction; fresh browser upload/download
  evidence and paired Odoo comparison remain open.

## QA result for candidate `bb3487c2` (2026-09-13)

## QA result for candidate `8fdf7be3` (2026-09-13)

- Direct authenticated API verification passed for local Base storage:
  upload returned 200, wrote the configured `/tmp/core3-base-attachments-qa`
  file, appeared in two fresh contact-detail page loads, and downloaded with
  matching source bytes and attachment filename.
- Anonymous page and attachment download requests returned 401. Focused Base
  permissions and the declared storage/action contracts passed.
- Authenticated Chromium login and Base detail rendering were confirmed, but
  the bounded desktop/mobile capture runner timed out waiting for the hidden
  file input after 8 seconds. Existing images are outside Git; no complete
  fresh browser journey is claimed. Odoo paired comparison remains open.
- Focused Base: 5 tests / 62 assertions; configured client document
  components: 33 tests; audit 647/662/1112; frontend build; and diff check
  pass. `bun run lint` is not defined in this package and therefore is an
  explicit unavailable gate, not a pass.
- Blocker `BASE-ATTACH-QA-001`: fresh authenticated desktop/mobile
  upload/download evidence is incomplete due the bounded browser timeout.
  Do not grant full Base sign-off.

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

## Capacity recycle ownership update (2026-09-13)

Base developer ownership remains `agent/odoo-owner-base-wave1` at
`/home/nhanjs/projects/core3-worktrees/odoo-owner-base-wave1`, last commit
`5ae2cdd1`, with six-file attachment work dirty and uncommitted. The QA context
is `agent/base-contact-attachments-qa` at `42d189da`, ledger-only. Takeover is
unsafe; the original owner must finish, test, and commit before QA. Base remains
pending and no replacement dispatch was made.

## Reviewer reconciliation `a1644b7c` (2026-09-13)

Integrated the bounded Base Contacts attachment/hierarchy slice as `eda49a35`
after preserving active CRM/contact-ID and inline attachment behavior during
conflict resolution. Contacts focused verification passed **6/73 assertions**;
audit passed **661/670/1,154**; frontend build and diff-check passed, with QA
targeted ESLint green. Authenticated exact-content upload/download, reload,
hierarchy, stale/CRUD/permission, dispatcher-403, and desktop/mobile evidence
passed. Restart durability under duckdb-memory and fresh paired authenticated
Odoo comparison remain open; no full Base sign-off.

## Reviewer reconciliation `6867ff7b` (2026-09-13)

Integrated the Base attachment durability repair as `339d44f4`. Post-merge
Contacts passed **7/76**, full Base **31/310**, audit **661/670/1,158**,
frontend build, and diff-check; QA reports file-backed reopen/replay, exact
upload/download, hierarchy/CRUD/stale/permission, and desktop/mobile evidence.
The shared attachment-panel UI journey and fresh authenticated Odoo comparison
remain open; no full Base sign-off.

## Contact duplicate workflow slice (2026-09-22)

Odoo 19's authenticated Contacts form exposes Duplicate from the Actions menu
and opens a new editable contact named with the source name plus ` (copy)`.
Core3 now exposes the same bounded workflow from `contact-detail`: the page
owns the Actions menu, while `api/contact-detail.yaml` owns the permissioned
client/server actions and durable mutation. The mutation copies contact fields
and category relations, uses deterministic IDs, and guards missing, archived,
wrong-company, stale, and duplicate-ID requests.

`test/base_contact_duplicate.integration.test.ts` covers the page/API
separation, data and relation copying, guards, second-copy numbering, and
file-backed restart. The suite, UI audit, frontend build, and diff check pass.
Live Odoo menu/copy behavior was observed, but fresh Core3 desktop/mobile
captures were blocked when bsk sessions stopped before the duplicate transition;
no visual parity sign-off is claimed. Evidence is in
`evidence/base/2026-09-22/BASE-CONTACT-DUPLICATE-001/`.
