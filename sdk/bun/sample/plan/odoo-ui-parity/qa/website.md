# website QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/website-desktop.png and website-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: active
QA slot: dispatchable website assignment (pending wave dispatch)
Module owner: website module owner
Verification trigger: feature-complete
Candidate commit: pending commit for Website lifecycle slice

Detailed execution matrix: [`test-plans/website.md`](test-plans/website.md). It is the module-level source for page publishing, public visibility, YAML/HTML rendering, actors, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| WEBSITE-WF-001 | Draft page publish/unpublish lifecycle | `bun test ./test/website_pages.integration.test.ts`; persisted state/version, duplicate-transition conflict, and editor/manager boundary | pass for contract/integration slice |
| WEBSITE-FUNC-002 | Page Manager metadata/content edit | `website_pages.integration.test.ts`; migration-backed `content_html` and metadata persist with site and row-version guards, stale replay returns 409 | pass for API contract; authenticated browser edit/reload remains planned |
| WEBSITE-FUNC-003 | Public content safety | `website_public.integration.test.ts` and live browser smoke; published content is rendered through an allowlist sanitizer and unsafe tags are excluded | pass for Core3 runtime; rich editor workflow remains planned |
| WEBSITE-DATA-001 | Restart and migration replay | `website_pages.integration.test.ts`; file-backed DuckDB preserves edited content/state/version after close/reopen and idempotent migration replay | pass for isolated restart contract |
| WEBSITE-PERM-003 | Public multi-site scope | `website_public.integration.test.ts`; duplicate `/` pages resolve by explicit `website_id`, and a page ID from another site is denied | pass for public site-scope contract; company/actor boundary remains planned |
| WEBSITE-DATA-002 | Published asset delivery | `website_public.integration.test.ts`; published page exposes its public asset URL, binary SVG delivery returns the correct MIME/content, unsupported methods return 405, and missing assets return 404 | pass for API contract; upload/editor asset workflow remains planned |
| WEBSITE-DATA-003 | Asset upload/download | `website_assets.integration.test.ts`; multipart upload persists private metadata and storage key, authenticated download returns exact bytes, and upload remains non-public by default | pass for API contract; browser attachment interaction remains planned |
| WEBSITE-PUBLIC-001 | Published-only public page visibility | `website_public.integration.test.ts`; published home resolves by path/list/id while draft Contact us is absent and unsupported methods return 405 | pass for service/API boundary |
| WEBSITE-UI-005 | Public Website page route/render seam | `website_public.integration.test.ts`; `/website/page?path=...` is registered and the component uses `@core3/client/html` with published API data | pass for implementation contract; browser runtime verified separately |
| WEBSITE-UI-006 | Public page desktop/mobile runtime | Single-module server `:4310` + authenticated headless browser; published Home rendered at 1440x900 and 390x844, draft `/contactus` showed unavailable state | pass for Core3 runtime; paired Odoo comparison remains pending; artifacts `/tmp/core3-odoo-parity/website-public-desktop.png`, `/tmp/core3-odoo-parity/website-public-mobile.png` |
| WEBSITE-UI-007 | Authenticated Page Manager edit/reload | Single-module server `:4310` + admin headless browser; status-column row menu exposed Edit, Save changed title/URL/content, and reload preserved the row | pass for Core3 runtime; artifacts are ephemeral outside Git; Odoo comparison and durable restart check remain pending |
| WEBSITE-UI-008 | Public asset runtime | Single-module server `:4310` + headless browser at 390x844; seeded public SVG loaded with natural width 240 and no page errors | pass for Core3 runtime; artifact `/tmp/core3-odoo-parity/website-public-asset-mobile.png`; paired Odoo comparison pending |
| WEBSITE-UI-009 | Page detail attachment manager | Single-module server `:4310` + authenticated headless browser at 390x844; opened the Page Manager detail route, expanded Page assets, uploaded `browser-hero.svg`, received HTTP 200, and the new asset appeared with no page errors | pass for Core3 runtime; artifact `/tmp/core3-odoo-parity/website-detail-asset-mobile.png`; paired Odoo comparison pending |
| WEBSITE-FUNC-001 | Website Homepage/Page Manager/public boundary suite | `bun test ./test/website*.integration.test.ts --timeout 20000` — 13 tests, 70 assertions | pass for focused scope |
| WEBSITE-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| WEBSITE-BUG-001 | Public renderer called unsupported fluent `main` getter and produced a blank page | `f95d0965` | Live browser smoke after frontend rebuild; published Home rendered without page errors | fixed |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
