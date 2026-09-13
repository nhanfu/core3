# blog parity progress

Module owner: blog module owner
QA assignment: DEV-3 Blog candidate reviewed; dedicated QA reconciled
Status: bounded-pass-conditional
Verification trigger: candidate commit
Candidate commit: 1c4b35c3; active equivalent product commit c1b243af

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
- The candidate product tree is already present on the active branch as
  `c1b243af`; cherry-pick of `1c4b35c3` was empty after ledger conflicts were
  preserved. Active focused retest: 2 tests, 13 assertions, 0 failures.
- Browser actor verification, restart/migration evidence, site scope, and
  paired Odoo desktop/mobile comparison remain open.

## R2 blocker

QA candidate `6ae81b4e` is blocked by `BLOG-ACTOR-001`: the normal authenticated
private `/api/query` and detail datasource path leak Demo-company blog, post, and
attachment rows after switching to Core3 Vietnam, although direct download is
correctly denied with 404. Route a same-module repair in
`/home/nhanjs/projects/core3-worktrees/blog-wave-dev3` to trace session/company
context through query, prefetch, and attachment reads, then add focused runtime
isolation evidence before QA retest. The Blog-only login's `Unknown page:
dashboard` warning is also retained. No integration is permitted until this is
fixed; Tags remain integrated and broader restart/full-workflow/Odoo gates stay
open.

## Next bounded task

Same-module takeover in `/home/nhanjs/projects/core3-worktrees/blog-wave-dev3`
must implement and test the site/company actor-boundary slice (private 401/403,
published/draft visibility, scoped mutations, stale/missing/atomicity), then
trigger `QA-BLOG-WAVE-20260913-R2`. Owner handle is unavailable and no
agent-dispatch handle is exposed here; keep this event pending. Tags/restart,
full menu-workflow, Temporal, and paired Odoo gates remain open.
