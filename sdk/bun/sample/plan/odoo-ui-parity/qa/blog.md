# blog QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/blog-desktop.png and blog-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: dormant
QA slot: dispatchable blog assignment (pending wave dispatch)
Module owner: blog module owner
Verification trigger: feature-complete
Candidate commit: none

Detailed execution matrix: [`test-plans/blog.md`](test-plans/blog.md). It is the module-level source for blogs, posts, taxonomy, publication, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| BLOG-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |
| BLOG-WF-001 | Post publication lifecycle | `bun test ./test/blog_blogs.integration.test.ts ./test/blog_tag_categories.integration.test.ts` — 5 tests, 29 assertions; authenticated YAML action transport publishes/unpublishes `blog-post-demo-002`, persists versions 2/3, records publication date, and rejects duplicate publish | pass for service/API workflow; public/browser visibility and Odoo comparison remain open |
| BLOG-PUBLIC-001 | Published-only public list/detail | `bun test ./test/blog_public.integration.test.ts` — 2 tests, 8 assertions; persisted SQL returns only `blog-post-demo-001`, draft detail returns no row, public routes return published detail and 404 drafts, and unsupported methods return 405 | pass for service/API public boundary; authenticated/public desktop-mobile capture and Odoo comparison remain open |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| — | No current-wave QA run | — | — | pending |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
