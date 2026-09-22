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

## R2 repair reconciliation

QA repair `f5786b78` is conditionally integrated with prerequisite `be30c03f`
and active repair commit `d8b51f1a`. Active Blog verification is 18 tests/100
assertions with audit 661/670/1161, Sass, frontend build, targeted ESLint, and
diff-check passing. Vietnam read isolation, detail prefetch, and query-widening
resistance are covered. Live process-restart upload persistence is limited by
the memory-mode runner; authenticated Odoo comparison and full menu/workflow
gates remain open.

## BLOG-POST-ARCHIVE-001 — 2026-09-21

Implemented the next source-backed Blog post slice from Odoo's
`website_pages_views.xml` and `models/website_blog.py`: durable post archive
state with active-only reads, Archived filtering, permissioned Archive and
Unarchive actions, and archive-to-unpublished semantics. The page remains
layout-only; workflow/API contracts own persistence and guards.

- Focused isolated test: `bun test ./test/blog_post_archive.integration.test.ts
  --timeout 20000` — 3 pass, 13 assertions.
- Blog Sass build and Blog-scoped `git diff --check` passed.
- Authenticated Odoo browser probe captured desktop/mobile 404 blockers under
  `/tmp/core3-odoo-parity/blog/2026-09-21/`; Core3 `:3001` refused connection.
- Full Blog wildcard regression was attempted but shared discovery was blocked
  by unrelated concurrent Sales duplicate datasource `sale_quotation_templates`;
  no full-suite claim is made.

## BLOG-BLOG-ARCHIVE-001 — 2026-09-22

Implemented the next source-backed Blog slice from Odoo 19's
`BlogBlog.active`, `BlogBlog.write()` cascade, and Blogs Archived search filter.
The page/API contract remains separated by `page.id: blog`; the existing
baseline active column is reused and the workflow owns durable archive state.

- `services/blog/pages/blogs.yaml` now defaults to active blogs, exposes the
  Records Active/Archived filter, and declares row archive affordances.
- `services/blog/api/blogs.yaml` owns the active-state datasource and
  permissioned archive/unarchive actions; `pages/blog-blog-workflow.yaml`
  enforces row-version/company guards and cascades to child posts.
- `services/blog/operations.yaml` requires the parent blog to be active for
  public list/detail reads.
- Focused test: `bun test ./test/blog_blog_archive.integration.test.ts
-  --timeout 20000` — 4 pass, 25 assertions, including file-backed restart.
- Blog wildcard: `bun test ./test/blog*.integration.test.ts --timeout 20000` —
  32 pass, 181 assertions; UI audit passed at 784 pages, 793 routes, and 1,614
  datasources; Blog Sass, targeted ESLint, and diff-check passed.
- Odoo desktop/mobile blocker captures are recorded under the 2026-09-22
  Blog evidence bundle. Website/Blog is not installed in `core3_reference`
  (`/blog` is 404), and Core3 `localhost:3001` refused connection; no paired
  visual-parity claim is made.

## BLOG-POST-NEW-001 — 2026-09-22

Aligned the existing Blog Posts create entry point to Odoo's
`website_blog.blog_post_action_add` source action. The modal now exposes only
Select Blog and Blog Post Title; the server derives blog/company fields from
the selected active current-company blog, generates the durable post ID, and
creates an active Draft atomically.

- Focused test: `bun test ./test/blog_post_new.integration.test.ts
  --timeout 20000` — 4 pass, 22 assertions.
- Invalid title/blog, archived blog, cross-company blog, read-only actor, and
  file-backed restart cases are covered.
- BrowserSkill is connected to instance `245ea108`, but the authenticated Odoo
  user tab was already borrowed by session `wabp`; no independent browser or
  login was used, and no visual-parity claim is made. Evidence records the
  exact blocker and the absence of captures.
