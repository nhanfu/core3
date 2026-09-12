# Base module QA ledger

Status: `ready-for-test`
Assigned QA: `QA-1`
QA mode: dispatchable bounded task; activate on feature-complete,
merge-candidate, post-merge, refactor-impact, or release.
Verification trigger: `feature-complete`
Candidate commit: `pending`
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
