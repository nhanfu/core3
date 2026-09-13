# Base module QA ledger

Status: `ready-for-test`
Assigned QA: `QA-1`
QA mode: dispatchable bounded task; activate on feature-complete,
merge-candidate, post-merge, refactor-impact, or release.
Verification trigger: `feature-complete`
Candidate commit: `8fdf7be3`
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

## QA verification: candidate `8fdf7be3` (2026-09-13)

- Runtime: bounded single-module Base server at `http://127.0.0.1:4010`, with
  `BASE_UPLOAD_ROOT=/tmp/core3-base-attachments-qa`; server was stopped after
  the probe.
- Authenticated API: `admin@tms.local / admin123` upload of
  `qa-contact-upload.txt` to `contact-demo` returned HTTP 200 and attachment
  metadata id `f9392a04-de17-43b8-9cd2-9e971c4d7493`. The local storage file
  was written, two fresh `contact-detail?cache=false` page loads listed the
  attachment, and download returned HTTP 200 with `Content-Disposition` for
  `qa-contact-upload.txt`. Downloaded bytes SHA-256 matched the source
  `/etc/hostname`: `25a6abebc1433659c257903b148dc4b55ef6e495d566c31f003fead6e7eb1dca`.
- Permission boundary: unauthenticated contact-detail and attachment
  download requests both returned HTTP 401 `UNAUTHORIZED`. Focused YAML
  assertions cover `base.contacts.write` upload and `base.contacts.read`
  download; `base.contacts.manage` remains on contact deletion.
- Authenticated browser: Chromium login and `/base/contacts/detail?id=contact-demo`
  rendered the contact, attachment panel, seeded `contact-brief.txt`, the
  previously uploaded `qa-contact-upload.txt`, and Add attachment control in
  the standalone login probe. The bounded capture runner did not complete hidden file-input
  interaction before its 8-second selector timeout; therefore this is not
  browser upload/download sign-off. Existing captures are outside Git at
  `/tmp/core3-base-contact-attachments-qa-desktop.png` and
  `/tmp/core3-base-contact-attachments-qa-mobile.png`; no new complete
  desktop/mobile attachment journey capture is claimed.
- Focused suites/gates: Base Contacts 5 tests / 62 assertions pass; configured
  client document-components suite 33 tests pass; audit passes at 647 pages /
  662 routes / 1112 datasources; frontend build passes; `git diff --check`
  passes. `bun run lint` is unavailable because this package has no `lint`
  script (`error: Script not found "lint"`); no lint result is claimed.
- Paired Odoo comparison: not completed in this bounded run; no full parity
  sign-off is granted.

### Blocker `BASE-ATTACH-QA-001`

The bounded Chromium capture runner timed out waiting for the hidden file
input (`page.waitForSelector('input[type=file]')`, 8 seconds) after the
authenticated page itself was confirmed. This leaves fresh authenticated
desktop/mobile upload/download captures unproven even though the direct API
journey, local storage write, persistence across page reloads, download bytes,
and permission boundaries passed. The candidate remains `pending-qa`.

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
- Direct API/storage upload/download persistence passed, but the bounded
  browser capture timed out during hidden file-input interaction. Fresh
  browser capture and Odoo paired visual comparison remain open; no full
  module sign-off is claimed.

## Reviewer disposition — candidate `c6be711f`

- Integrated on the active branch as `d6df64b5`; scope is limited to Base
  Contacts company-hierarchy selectors, persistence fields, and active-company
  self/parent guards.
- Post-merge verification passed: Base Contacts focused suite, 6 tests / 73
  assertions; Base UI audit (659 pages / 668 routes / 1149 datasources),
  targeted ESLint, and `git diff --check`.
- Requested authenticated desktop/mobile browser smoke was unavailable. Existing
  attachment evidence remains preserved but is not treated as fresh hierarchy
  browser evidence. Base remains `pending-qa`; no module sign-off is claimed.
## 2026-09-13 coordinator dispatch — bounded contact attachment wave

- Existing owner `agent/odoo-owner-base-wave1` is assigned on
  `/home/nhanjs/projects/core3-worktrees/odoo-owner-base-wave1`, based at
  `a353b408`. Development event: `DEV-BASE-WAVE-20260913-R2`; QA event:
  `QA-BASE-WAVE-20260913-R2`; handoff commit: `5ae2cdd1`.
- Scope is the contact-detail attachment panel binding to the existing
  page-id-owned metadata/upload/download API, with empty/error states,
  permission/company scope, stale/no-partial-write behavior, persistence, and
  focused tests. Candidate pending; existing ledgers and aggregate progress
  are preserved.
## DEV/QA reconciliation — `DEV-BASE-WAVE-20260913-R2` / `QA-BASE-WAVE-20260913-R2`

- The owner handoff `5ae2cdd1` requested the contact attachment panel, but
  authoritative main already contains the implementation across `3393d850`
  (metadata persistence/API), `452ace97` (panel exposure), and `887fec41`
  (registered attachment actions). No duplicate owner patch is required.
- QA event triggered/reconciled against the existing implementation. Active
  checkout command `bun test test/base_contacts.integration.test.ts` passed
  **6 tests / 73 assertions**, covering page/API ownership, Contacts view
  contracts, deterministic/search/empty data, permissions/transport errors,
  archive/restore stale guards, and hierarchy persistence.
- Bounded result: contact attachment panel/actions and guarded metadata
  upload/download API are present in the existing implementation history; the
  current repository contract is green. Base remains conditional/pending.
- Explicit blockers preserved: authenticated attachment upload/download and
  end-to-end persistence after browser reload/restart were not freshly proven;
  authenticated desktop/mobile browser interaction and captures remain open;
  paired authenticated Odoo visual comparison remains open. No full Base
  module sign-off is implied.

## 2026-09-13 R2 coordinator dispatch

## QA-pending candidate `a1644b7c` (2026-09-13)

- Existing owner/worktree: `agent/odoo-owner-base-wave1` at
  `/home/nhanjs/projects/core3-worktrees/odoo-owner-base-wave1`; candidate is
  not merged and awaits the existing Base QA owner.
- Coordinator evidence: Base Contacts suite **6 tests / 68 assertions** and
  audit **647 pages / 662 routes / 1,114 datasources** pass. Candidate
  build/lint/diff-check confirmation remains with QA.
- Browser attachment upload/download, restart, actor, and paired Odoo gates
  remain open.

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-BASE-HIERARCHY-WAVE-20260913-R2` → `QA-BASE-HIERARCHY-WAVE-20260913-R2` | existing `agent/base-contact-attachments-qa` in `/home/nhanjs/projects/core3-worktrees/base-contact-attachments-qa` | Contact company hierarchy persistence, company/role boundaries, cycle/duplicate/invalid/missing/stale guards, and focused atomicity tests | dispatched in `42d189da`; awaiting self-contained product commit before QA |

## Capacity recycle ownership update (2026-09-13)

- Existing developer owner remains `agent/odoo-owner-base-wave1` in
  `/home/nhanjs/projects/core3-worktrees/odoo-owner-base-wave1`, last commit
  `5ae2cdd1`. Its six-file contact-attachment implementation is uncommitted;
  takeover is unsafe and no replacement owner is authorized.
- Existing QA context remains `agent/base-contact-attachments-qa` in
  `/home/nhanjs/projects/core3-worktrees/base-contact-attachments-qa` at
  `42d189da`, ledger-only. QA must wait for the original owner to finish,
  test, and commit a self-contained candidate.
- Dispatch status: **blocked on original owner completion**. Preserve the
  dirty developer worktree and existing QA findings; resume coordination when
  a committed candidate appears.
