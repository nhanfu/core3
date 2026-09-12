# Base module QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/base-desktop.png and base-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

Status: `qa-in-progress`
Assigned QA: `QA-1`
QA mode: dispatchable bounded task; activate on feature-complete,
merge-candidate, post-merge, refactor-impact, or release.
Verification trigger: `feature-complete`
Candidate commit: `ecf1880f`
Runtime: `bun run agent:module -- base --port=4010`

## Coverage

- [x] YAML page/API ownership, menus, routes, deterministic fixtures, search,
  archive, empty, and error states.
- [x] Base configuration CRUD, validation, and optimistic concurrency tests.
- [x] Contact detail activity, chatter, stat buttons, and authenticated render.
- [x] Base contact creation duplicate-email guard returns success for a new
  email and rejects only an existing active email; this is also exercised by
  CRM's cross-service lead conversion.
- [x] Contact attachment table and guarded upload/download API contract.
- [ ] Authenticated attachment upload/download journey; attachment panel is
      not currently visible in the shared renderer.
- [ ] Fresh paired Odoo visual comparison for this candidate.

## Current regression evidence (2026-09-12)

- Focused Base suite: `bun test ./test/base_*.integration.test.ts --timeout
  20000` — 29 passed, 295 assertions, 0 failed across 9 files.
- Fresh authenticated Base module runner on port 4038 checked all 26 manifest
  routes at desktop/mobile: 52/52 passed with no page errors, failed requests,
  HTTP errors, blank states, or horizontal overflow.
- The current bounded contact detail intentionally exposes Edit and activity,
  chatter, and stat actions but not an Archive control; archive/restore is
  covered by the Contacts API contract and remains separate from this detail
  surface until the source-equivalent action is implemented.
- The detailed per-module checklist is approved at
  `qa/test-plans/base.md`; attachment upload/download, import/export, richer
  configuration and paired Odoo comparison remain open.

## Decision

`pending-qa`: implementation is testable, but attachment renderer coverage
and paired Odoo comparison remain open. Authenticated evidence includes the
mobile list and desktop/mobile detail; the desktop list capture is excluded
because its run had a transient `/api/apps` failure.

## DEV candidate: attachment panel visibility (2026-09-13)

- Candidate branch: `agent/base-contact-attachments-qa`
- Authenticated route: `/base/contacts/detail?id=contact-demo`
- Desktop/mobile: attachment panel, `contact-brief.txt`, and Add attachment
  control visible; no page/request errors or horizontal overflow.
- Focused tests: client document components 31 tests; Base Contacts 5 tests /
  61 assertions. Audit, frontend build, ESLint, and diff check pass.
- Blocker: a real browser file upload did not return before the runner timeout;
  persistence and download delivery still require QA follow-up.
- Odoo paired comparison remains open; screenshots are outside Git under
  `/tmp/core3-base-contact-attachments-qa-*.png`.

## QA review record — candidate `bb3487c2` / QA `1a404627`

- The explicit upload probe exceeded the 30-second runner limit and was
  stopped; the bounded retest reproduced `BASE-ATTACH-001`.
- No browser/upload process remained running. Upload persistence, download
  delivery, and paired Odoo comparison remain open; no sign-off is granted.
