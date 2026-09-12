# blog parity progress

Module owner: blog module owner
QA assignment: DEV-3 Blog candidate reviewed; dedicated QA pending
Status: qa-in-progress
Verification trigger: candidate commit
Candidate commit: 2de4ba3f

## Current state

This module is registered in odoo-parity-plan.md. The current candidate adds
relation-safe deletion for unused tag categories with persisted CRUD and stale
write coverage. No full-module parity claim is made here.

## Current-wave evidence

- `2de4ba3f` adds the permissioned `blog.tag_categories.delete` action and the
  list-row Delete affordance.
- `bun test ./test/blog*.integration.test.ts --timeout 20000`: 13 passed, 71
  assertions, 0 failures.
- The focused delete case proves persisted deletion, referenced-category
  protection, stale-row rejection, and missing-record behavior.
- Browser actor verification, restart/migration evidence, site scope, and
  paired Odoo desktop/mobile comparison remain open.

## Next bounded task

Dispatch dedicated QA against `2de4ba3f`, then continue the remaining Blog permission,
browser, restart, site-scope, Temporal, and paired Odoo gates. Update this
file only with evidence from the matching module owner.
