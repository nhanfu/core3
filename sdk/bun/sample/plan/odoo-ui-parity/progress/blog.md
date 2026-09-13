# blog parity progress

Module owner: blog module owner
QA assignment: DEV-3 Blog candidate reviewed; dedicated QA pending
Status: qa-in-progress
Verification trigger: candidate commit
Candidate commit: 1c4b35c3

## Current state

This module is registered in odoo-parity-plan.md. The current candidate adds a
page/API-separated Blog Tags configuration slice with persisted create/edit/delete,
duplicate and blank-name validation, optimistic concurrency, and relation-safe
deletion. No full-module parity claim is made here.

## Current-wave evidence

- The Blog Tags page now joins `pages/tags.yaml` to `api/tags.yaml` by
  `page.id`, with list-row Edit/Delete affordances and read error states.
- `bun test ./test/blog*.integration.test.ts --timeout 20000`: 15 passed, 84
  assertions, 0 failures.
- The focused tag case proves persisted create/edit/delete, duplicate and
  blank-name rejection, stale-row rejection, and referenced-tag protection.
- `bun run audit`, `bun run css:build:blog`, targeted ESLint, and `git diff
  --check` all pass.
- Browser actor verification, restart/migration evidence, site scope, and
  paired Odoo desktop/mobile comparison remain open.

## Next bounded task

Dispatch QA against the candidate commit, then continue the remaining Blog permission,
browser, restart, site-scope, Temporal, and paired Odoo gates. Update this
file only with evidence from the matching module owner.
