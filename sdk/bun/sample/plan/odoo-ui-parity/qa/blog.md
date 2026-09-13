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

| Event | Owner/worktree | Bounded scope | Status |
| --- | --- | --- | --- |
| `DEV-BLOG-WAVE-20260913-R2` → `QA-BLOG-WAVE-20260913-R2` | existing `agent/blog-wave-dev3` in `/home/nhanjs/projects/core3-worktrees/blog-wave-dev3` | Blog site/company actor boundaries for blogs, posts, and assets, private 401/403 behavior, published/draft visibility, and focused stale/missing/atomicity tests | owner later HEAD `15814f8f` remains dispatch-only; bounded Tags candidate was reviewed from `1c4b35c3` |

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

## Sign-off

- Functional Tags slice: pass
- Permissions tested actor boundary: pass
- Persistence/data integrity Tags slice: pass
- Core3 desktop/mobile runtime: pass
- Paired Odoo visual parity: pending
- Tester decision: bounded pass, conditionally reconciled on active `c1b243af`; no full module sign-off
