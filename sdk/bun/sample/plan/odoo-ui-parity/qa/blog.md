# blog QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/blog-desktop.png and blog-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: bounded-pass-integrated-conditional
QA slot: DEV-3 Blog assignment; dedicated QA reconciled
Module owner: blog module owner
Verification trigger: candidate commit
Candidate commit: 1c4b35c3 (product tree already present on active branch as c1b243af)

Detailed execution matrix: [`test-plans/blog.md`](test-plans/blog.md). It is the module-level source for blogs, posts, taxonomy, publication, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| BLOG-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | This reconciliation verifies the bounded Tags slice only; broader Blog gates remain open | pass for bounded slice; module sign-off remains open |
| BLOG-WF-001 | Post publication lifecycle | `bun test ./test/blog_blogs.integration.test.ts ./test/blog_tag_categories.integration.test.ts` — 5 tests, 29 assertions; authenticated YAML action transport publishes/unpublishes `blog-post-demo-002`, persists versions 2/3, records publication date, and rejects duplicate publish | pass for service/API workflow; public/browser visibility and Odoo comparison remain open |
| BLOG-PUBLIC-001 | Published-only public list/detail | `bun test ./test/blog_public.integration.test.ts` — 2 tests, 8 assertions; persisted SQL returns only `blog-post-demo-001`, draft detail returns no row, public routes return published detail and 404 drafts, and unsupported methods return 405; unauthenticated browser captures `/tmp/core3-odoo-parity/blog-public-20260913-desktop.png` and `blog-public-20260913-mobile.png` returned list/detail 200 and draft detail 404 | pass for service/API and public desktop/mobile browser boundary; expected 404 probe console warning, assets and Odoo comparison remain open |
| BLOG-PUBLIC-002 | Public post renderer | `bun test ./test/blog_public.integration.test.ts` — renderer contract asserts Fluent HTML, module-owned published post API, `/blog/post` route, and unsafe-tag filtering; unauthenticated browser checks at 1440x900 and 390x844 rendered published post with no errors/overflow, while draft returned Post unavailable | pass for Core3 public runtime; paired Odoo comparison and richer assets remain open |
| BLOG-FUNC-002 | Stored post content/editor | `bun test ./test/blog_blogs.integration.test.ts` and `blog_public.integration.test.ts`; `content_html` migration/demo is replayable, detail mutation persists content with row-version guards, and public operations expose it for the Fluent renderer | pass for Core3 content contract; authenticated desktop editor workflow and paired Odoo comparison remain open |
| BLOG-FUNC-003 | Post import/export/print | `bun test ./test/blog_blogs.integration.test.ts` — validated `Title|Subtitle|Author|Tags` import, invalid-row rejection, idempotent upsert, and the detail Print action; authenticated headless Chrome on desktop 1440x900 and mobile 390x844 opened the ListView utility menu, downloaded `blog-posts-export.xlsx`, and produced a valid XLSX ZIP (`PK\\x03\\x04`, 3,741 bytes) with the Blog Posts worksheet; existing authenticated mobile browser also exposed Import and invoked Print | pass for Core3 import/export/print runtime; richer Odoo export format comparison and paired Odoo visual comparison remain open |
| BLOG-UI-002 | Authenticated content edit and public sanitization | Single-module server `:4311` + authenticated mobile browser saved `<p>Browser <strong>content</strong> verified.</p><script>…</script>`, reload preserved it, and public desktop rendering retained P/STRONG but emitted zero SCRIPT elements with no errors | pass for Core3 runtime; artifact `/tmp/core3-odoo-parity/blog-content-public-desktop.png`; paired Odoo comparison remains pending |
| BLOG-UI-003 | Import and print affordances | Single-module server `:4311` + authenticated mobile browser exposed Import, persisted a `Browser import` row, opened its detail, and invoked the declared Print action; no API/page errors | pass for Core3 runtime; artifact `/tmp/core3-odoo-parity/blog-import-print-mobile.png`; paired Odoo comparison remains pending |
| BLOG-ASSET-001 | Post attachment upload/download | `bun test ./test/blog_post_assets.integration.test.ts` — 2 tests, 11 assertions; read-only actor receives 403, editor multipart upload persists `blog_post_attachments` metadata, exact bytes remain downloadable after DuckDB close/reopen, and the upload root is cleaned up | pass for persisted/restart/editor permission contract; public asset policy, editor rendering and Odoo comparison remain open |
| BLOG-UI-001 | Authenticated post attachment manager | Single-module server `:4311` + authenticated headless browser at 390x844; opened the published post detail, expanded Attachments, uploaded `browser-blog.txt`, received HTTP 200, and the asset appeared with no page errors | pass for Core3 runtime; paired Odoo comparison remains pending; artifact `/tmp/core3-odoo-parity/blog-detail-asset-mobile.png` |
| BLOG-FUNC-008 | Relation-safe tag category deletion | `bun test ./test/blog_tag_categories.integration.test.ts` — 3 tests, 22 assertions; the new `blog.tag_categories.delete` action deletes an unused persisted category, rejects referenced categories with `409 BLOG_TAG_CATEGORY_IN_USE`, rejects stale row versions with `409 STALE_RECORD`, and returns `404 BLOG_TAG_CATEGORY_NOT_FOUND` after deletion | pass for isolated service contract; authenticated browser, actor matrix, restart, and paired Odoo evidence remain open |
| BLOG-FUNC-009 | Blog tag CRUD and relation safety | `bun test ./test/blog_tags.integration.test.ts` — 2 tests, 13 assertions; page/API join, persisted create/edit/delete, duplicate and blank-name rejection, stale-row rejection, and referenced-tag protection pass | pass for isolated service contract; authenticated browser, actor matrix, restart, site scope, and paired Odoo evidence remain open |
| BLOG-FUNC-010 | Authenticated Tags CRUD persistence | Admin desktop created, edited, deleted a tag with refresh persistence; mobile created a tag that appeared after refresh; no page errors or horizontal overflow | pass |
| BLOG-PERM-006 | Blog read/write boundary | Admin saw tag rows and Edit/Delete controls; Fleet reached the route but received the declared `blog.read` 403 with no rows or mutation controls | pass for tested actor boundary; wrong-company/site and unauthenticated private-route gates remain open |
| BLOG-UI-006 | Tags desktop/mobile runtime | Authenticated Admin desktop/mobile captures rendered list, New, Edit/Delete controls with no overflow or page errors; paired Odoo visual comparison was not run | pass for Core3 responsive runtime |
| BLOG-QA-007 | Candidate regression/tooling gates | Owner QA: 15 tests / 84 assertions; audit 659 pages / 668 routes / 1,135 datasources; Blog Sass, targeted ESLint, and diff-check passed. Active branch re-ran `bun test ./test/blog_tags.integration.test.ts`: 2 tests, 13 assertions, 0 failures. | pass; YAML ESLint is not applicable and reports its standard ignored-file warning |

## R2 dispatch

## Post tag_ids relation slice — 2026-09-20

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| BLOG-FUNC-011 | Odoo `blog.post.tag_ids` add/remove | `bun test ./test/blog_post_tags.integration.test.ts` — 4 tests, 20 assertions; page/API separation, deterministic relation fixtures, add/remove persistence, duplicate/invalid/parent-stale/line-stale guards, and denormalized post tag names pass | pass for bounded service/API slice; browser/Odoo comparison remains open |
| BLOG-PERM-007 | Post tag relation permission boundary | The focused slice uses `blog.read` for relation/lookup reads and `blog.write` for add/remove; read-only action API receives 403 | pass for contract/API boundary; full actor/browser gate remains open |
| BLOG-FUNC-012 | Post tag restart durability | The focused slice closes and reopens DuckDB, reapplies migrations, and finds both relation rows and synchronized post tag names/version | pass for file-backed restart contract |
| BLOG-QA-008 | Blog regression/tooling gates | Full Blog suite: 25 tests / 142 assertions; UI audit: 665 pages / 674 routes / 1,182 datasources; targeted Blog ESLint and `git diff --check` passed | pass; no full Blog sign-off implied |

## Post archive/unarchive slice — 2026-09-21

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| BLOG-ARCHIVE-FUNC-001 | Durable Odoo `blog.post.active` archive state | `test/blog_post_archive.integration.test.ts` — published demo post archives to `active=false`, `Archived`, `published_date=NULL`, then unarchives to active Draft with versions 2/3 | pass |
| BLOG-ARCHIVE-FILTER-001 | Active-only manager/public reads and Archived filter | Same focused test verifies active default, declared active filter, and no published read after archive; `operations.yaml` guards public list/detail with `p.active = TRUE` | pass at contract level |
| BLOG-ARCHIVE-PERM-001 | Archive permission boundary | Same focused test: actor with `blog.read`/`blog.write` but no `blog.manage` receives 403 and row remains unchanged | pass |
| BLOG-ARCHIVE-UI-001 | Authenticated Odoo/Core3 desktop/mobile comparison | `/tmp/core3-odoo-parity/blog/2026-09-21/odoo-blog-404-desktop.png` (1916x833), `odoo-blog-404-mobile.png` (390x844) | blocked: Odoo Website/Blog is not installed in `core3_reference`; Core3 `localhost:3001` refused connection |
| BLOG-QA-009 | Slice regression/tooling gates | Focused archive test 3/13, Blog Sass build, and Blog-scoped `git diff --check`; full Blog wildcard attempted | conditional pass; full wildcard blocked by unrelated concurrent Sales duplicate `sale_quotation_templates` discovery ID |

## Blog archive/unarchive slice — 2026-09-22

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| BLOG-BLOG-ARCHIVE-FUNC-001 | Durable Odoo `blog.blog.active` archive state | `test/blog_blog_archive.integration.test.ts` — active blog archives to `active=false`, increments the blog version, cascades every child post to inactive Archived with cleared publication dates, then unarchives to active Draft without republishing | pass: 4 tests / 25 assertions |
| BLOG-BLOG-ARCHIVE-PERM-001 | Archive permission boundary | The same focused test rejects a `blog.read`/`blog.write` actor with 403 and leaves the blog and child posts unchanged | pass |
| BLOG-BLOG-ARCHIVE-WF-001 | Workflow and stale guard | Archive/unarchive actions are `blog.manage` transitions; a stale parent version returns 409 before any cascade step runs | pass |
| BLOG-BLOG-ARCHIVE-RESTART-001 | Restart durability | File-backed DuckDB is closed and reopened after archive; the inactive parent and all inactive child posts remain persisted after migrations are reapplied | pass |
| BLOG-BLOG-ARCHIVE-UI-001 | Authenticated Odoo/Core3 desktop/mobile comparison | `/tmp/core3-odoo-parity/blog/2026-09-22/odoo-blog-404-desktop.png`, `odoo-blog-404-mobile.png`; browser-check records the observed 404 and Core3 connection refusal | blocked: `core3_reference` does not have `website_blog` installed and Core3 `:3001` is unavailable; no visual-parity claim |
| BLOG-QA-010 | Slice regression/tooling gates | Focused test 4/25, Blog wildcard 32/181, UI audit 784/793/1,614, Blog Sass, targeted ESLint, and Blog-scoped diff-check passed | pass; paired visual parity remains blocked |

### BLOG-POST-ARCHIVE-001 evidence

See [`evidence/blog/2026-09-21/BLOG-POST-ARCHIVE-001/`](../evidence/blog/2026-09-21/BLOG-POST-ARCHIVE-001/). This is a bounded slice result and does not sign off the Blog module.

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-BLOG-WAVE-20260913-R2` → `QA-BLOG-WAVE-20260913-R2` | existing `agent/blog-wave-dev3` in `/home/nhanjs/projects/core3-worktrees/blog-wave-dev3` | Blog site/company actor boundaries for blogs, posts, and assets, private 401/403 behavior, published/draft visibility, and focused stale/missing/atomicity tests | owner handle unavailable (no running owner process; HEAD `15814f8f` remains dispatch-only). Approved same-module takeover requested in this exact worktree; agent dispatch is unavailable here, so QA cannot yet be triggered |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| — | No implementation defect found in bounded Tags slice | — | — | closed |

## Current candidate

- `BLOG-DEV-004`: Blog Tags CRUD slice, candidate `1c4b35c3`; active equivalent product tree is `c1b243af`.
- Cherry-pick of `1c4b35c3` was empty after preserving active ledgers: all three product files already matched the candidate. No duplicate merge was created.
- Focused Blog suite: 15 tests, 84 assertions, 0 failures; UI audit passed
  (659 pages, 668 routes, 1,135 datasources); Blog Sass build, targeted ESLint,
  and `git diff --check` passed.
- Dedicated QA completed for the bounded Tags candidate; active focused retest passed; no module sign-off is implied.
- Odoo desktop/mobile comparison was not feasible; restart/site scope, complete
  Blog menu/workflows, and paired Odoo gates remain open.

## R2 takeover request

- Take over only in `/home/nhanjs/projects/core3-worktrees/blog-wave-dev3`,
  inheriting the Blog ledger, Tags history, and owner findings; do not start a
  parallel worktree or replace `1c4b35c3`/`c1b243af`.
- Bounded task: implement site/company actor boundaries for Blog blogs, posts,
  and assets; prove private 401/403, published/draft visibility, scoped
  mutations, and focused stale/missing/atomicity behavior. Commit a
  self-contained candidate, then trigger `QA-BLOG-WAVE-20260913-R2` against
  that exact worktree.
- Status: takeover not dispatched because no agent-dispatch handle is exposed
  in the current environment.

## Sign-off

- Functional Tags slice: pass
- Permissions tested actor boundary: pass
- Persistence/data integrity Tags slice: pass
- Core3 desktop/mobile runtime: pass
- Paired Odoo visual parity: pending
- Tester decision: bounded pass, conditionally reconciled on active `c1b243af`; no full module sign-off

## Review reconciliation: Blog actor-boundary repair `f5786b78`

- The active branch lacked the blocked parent’s Blog company-boundary
  prerequisite, so the valid ordered bundle was integrated as prerequisite
  `be30c03f` (`6ae81b4e` Blog boundary/schema/API/page changes) plus repair
  `d8b51f1a` (the `f5786b78` selected-company read propagation and regression
  test). The later owner HEAD was not substituted.
- Conflict review retained the active generic `authenticatedCompanyName`
  helper and existing shared routing behavior while adding
  `current_company_name` propagation, Blog lookup scoping, and actor regression
  coverage. No unrelated module files were included.
- Active verification: Blog suite **18 pass, 0 fail, 100 assertions**; audit
  **661 pages / 670 routes / 1,161 datasources**; Blog Sass, frontend build,
  targeted ESLint, and `git diff --check` passed.
- QA evidence reconciled: Vietnam isolation, query-parameter widening
  resistance, detail-prefetch isolation, 401/403, visibility,
  upload/download, guards, desktop/mobile, and file-backed restart persistence
  passed. Live upload persistence across process restart remains limited by the
  memory-mode runner; authenticated paired Odoo comparison remains open.
- Disposition: **conditionally integrated bounded Blog actor-boundary repair**;
  full Blog sign-off remains open for live restart durability, full menu and
  workflow coverage, and Odoo parity.

## R2 actor-boundary retest and repair

- QA candidate `6ae81b4e` is **BLOCKED**. Private 401/403, published-versus-draft
  visibility, upload/download, persistence, actor mutation guards, regressions,
  build/audit/ESLint/diff-check, and desktop/mobile evidence passed.
- `BLOG-ACTOR-001`: after an authenticated Admin switches to Core3 Vietnam,
  normal private `/api/query` still exposes Demo-company rows for blogs, posts,
  and attachments. Direct attachment download correctly returns 404. The
  Blog-only login also logs `Unknown page: dashboard`; direct Blog routes work.
- Route the repair only to the registered Blog context in
  `/home/nhanjs/projects/core3-worktrees/blog-wave-dev3`: trace the actual
  session/company parameter through `/api/query`, page/detail datasource
  prefetch, and attachment reads; repair the root cause and add focused
  company-isolation/query/detail tests. Do not make a predicate-only or
  unrelated-module change. Require a self-contained commit and fresh runtime
  proof before `QA-BLOG-WAVE-20260913-R2` retest.
- Current owner context is at `6ae81b4e` with no new product commit after the
  blocked retest. Same-module takeover is required in this exact worktree;
  dispatch remains pending until an owner/takeover handle is available.
