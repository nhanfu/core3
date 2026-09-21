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
Candidate commit: 770aeab4 (DEV-2 Menu Editor)

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
| WEBSITE-WF-002 | Public asset promotion lifecycle | `website_assets.integration.test.ts`; manager-only publish/private actions require the requested visibility value, require the page to be published, increment asset row versions 1 → 3, reject stale replay, and preserve public state/version across a DuckDB close/reopen; authenticated mobile browser uploaded a private asset and changed its action from Make public to Make private with no page errors; live HTTP probe with `fleet@tms.local` received 403 `Requires permission: website.manage` | pass for service/API, direct permission boundary, restart persistence, and authenticated browser runtime; paired Odoo comparison remains open |
| WEBSITE-WF-003 | Menu Editor create/edit lifecycle | `website_menus.integration.test.ts`; declared row edit action creates and edits menu labels, parent, target behavior, and sequence; per-site duplicate URLs are rejected case-insensitively, stale writes return 409, invalid-site edits leave the record unchanged, and site names are derived from `website_id` | pass for YAML/service contract and persistence; authenticated browser edit/reload now pass; paired Odoo comparison remains open |
| WEBSITE-PERM-001 | Menu Editor actor boundary | `website_menus.integration.test.ts`; a `website.read`-only actor receives 403 from `website.menus.create` and no row is written; authenticated dispatcher route shows the explicit `Requires permission: website.read` error | pass for action endpoint and authenticated browser boundary; paired Odoo comparison remains open |
| WEBSITE-DATA-004 | Menu Editor site scope/restart | `website_menus.integration.test.ts`; second-site menu create/update preserves `website_id`, canonical site name, sequence, and row version after DuckDB close/reopen and migration replay; authenticated admin list shows Core3 Docs and Core3 Storefront rows, and the Core3 Docs edit form retains the Core3 Docs selection | pass for isolated persistence and authenticated browser site scope; process restart and paired Odoo comparison remain open |
| WEBSITE-PUBLIC-001 | Published-only public page visibility | `website_public.integration.test.ts`; published home resolves by path/list/id while draft Contact us is absent and unsupported methods return 405 | pass for service/API boundary |
| WEBSITE-UI-005 | Public Website page route/render seam | `website_public.integration.test.ts`; `/website/page?path=...` is registered and the component uses `@core3/client/html` with published API data | pass for implementation contract; browser runtime verified separately |
| WEBSITE-UI-006 | Public page desktop/mobile runtime | Single-module server `:4310` + authenticated headless browser; published Home rendered at 1440x900 and 390x844, draft `/contactus` showed unavailable state | pass for Core3 runtime; paired Odoo comparison remains pending; artifacts `/tmp/core3-odoo-parity/website-public-desktop.png`, `/tmp/core3-odoo-parity/website-public-mobile.png` |
| WEBSITE-UI-007 | Authenticated Page Manager edit/reload | Single-module server `:4310` + admin headless browser; status-column row menu exposed Edit, Save changed title/URL/content, and reload preserved the row | pass for Core3 runtime; artifacts are ephemeral outside Git; Odoo comparison and durable restart check remain pending |
| WEBSITE-UI-008 | Public asset runtime | Single-module server `:4310` + headless browser at 390x844; seeded public SVG loaded with natural width 240 and no page errors | pass for Core3 runtime; artifact `/tmp/core3-odoo-parity/website-public-asset-mobile.png`; paired Odoo comparison pending |
| WEBSITE-UI-009 | Page detail attachment manager | Single-module server `:4310` + authenticated headless browser at 390x844; opened the Page Manager detail route, expanded Page assets, uploaded `browser-hero.svg`, received HTTP 200, and the new asset appeared with no page errors | pass for Core3 runtime; artifact `/tmp/core3-odoo-parity/website-detail-asset-mobile.png`; paired Odoo comparison pending |
| WEBSITE-UI-010 | Page detail public asset action | Fresh Website runner `:4314` + authenticated headless browser at 390x844; uploaded `promote-browser-final-2.svg`, opened the attachment tool, clicked Make public, and observed Make private after the persisted refresh; seeded inline asset preview also returned 200 after the authenticated file-route fallback; no page/console errors | pass for Core3 runtime; artifact `/tmp/core3-odoo-parity/website-asset-visibility-mobile.png`; paired Odoo comparison pending |
| WEBSITE-UI-011 | Menu Editor row actions and responsive edit form | Single-module server `:4316` + authenticated headless browser; Odoo source `website_pages_tree_view` uses an object row action, while Core3 `row_actions: menu` requires a declared column action. After adding the permissioned `edit_website_menu` column action, desktop and mobile rows expose `More actions` → `Edit`; the second-site row opens with its canonical Website selection, Save persists changed label/URL, reload preserves it, and no page/console errors occurred | pass for Core3 browser interaction and Fluent contract; paired Odoo visual comparison pending; artifacts `/tmp/core3-odoo-parity/website-menu-editor-admin-desktop.png`, `/tmp/core3-odoo-parity/website-menu-editor-mobile.png`, `/tmp/core3-odoo-parity/website-menu-editor-saved-desktop.png` |
| WEBSITE-FUNC-001 | Website Homepage/Page Manager/public/menu/assets boundary suite | `bun test ./test/website*.integration.test.ts --timeout 20000` — 18 tests, 90 assertions | pass for focused scope |
| WEBSITE-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | Current Website slices cover publication, content, public visibility, assets, asset visibility, and Menu Editor CRUD; full module candidate is not submitted | pending; Menu Editor service actor/site-scope and replay slice advanced in DEV-2 follow-up |
| WEBSITE-FUNC-009 | Analytics dashboard source/API contract and durable daily telemetry | `test/website_analytics.integration.test.ts`; Odoo `backend_dashboard` route/menu mapped to Core3 `website-analysis`, daily metrics persist across migration replay and aggregate by site | pass for bounded contract/data slice; browser route blocked by unrelated Core3 startup error |
| WEBSITE-PERM-006 | Analytics read permission and failure states | `api/analysis.yaml`; every analytics datasource requires `website.read`, with explicit 403/503 contracts | pass for declared contract; authenticated actor/browser proof blocked with Core3 startup |
| WEBSITE-DATA-005 | Multi-site analytics scope and deterministic empty state | `website_analytics.integration.test.ts`; Core3 Storefront/Core3 Docs totals, site-scoped daily rows, empty totals/series, idempotent migration replay | pass |
| WEBSITE-UI-012 | Analytics desktop/mobile authenticated comparison | `/tmp/core3-odoo-parity/website-analytics-odoo-no-website-desktop.png`, `website-analytics-odoo-no-website-mobile.png`, `website-analytics-core3-blocked-desktop.png`, `website-analytics-core3-blocked-mobile.png` | blocked; Odoo Website is not exposed and Core3 starts with HTTP 502 from unrelated CRM YAML |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| WEBSITE-BUG-001 | Public renderer called unsupported fluent `main` getter and produced a blank page | `f95d0965` | Live browser smoke after frontend rebuild; published Home rendered without page errors | fixed |
| WEBSITE-BUG-002 | Authenticated preview of seeded inline asset passed an object/null storage key to `path.join`, returning HTTP 500 | working tree | `file-routes.ts` now serves valid `content_base64` when no local storage key exists; fresh Website runner returned asset HTTP 200 and browser errors cleared | fixed |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off

## 2026-09-22 page tracking checkpoint

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| WEBSITE-FUNC-010 | Page Manager tracked/untracked/not-SEO filters | `test/website_page_tracking.integration.test.ts`; Odoo source anchors, page/API join, durable filter predicates, deterministic rows | pass: 3 tests / 22 assertions |
| WEBSITE-WF-007 | Tracking flag edit, stale guard, migration replay, restart | `test/website_page_tracking.integration.test.ts`; `website_pages.track` and row version survive close/reopen and idempotent migration | pass |
| WEBSITE-PERM-007 | Read-only actor cannot edit tracking | `test/website_page_tracking.integration.test.ts`; action endpoint returns 403 and the row remains unchanged | pass |
| WEBSITE-UI-012 | Tracking/SEO filter browser rendering | `/tmp/core3-odoo-parity/website-page-tracking/core3-desktop.png` and `core3-mobile.png`; authenticated isolated Website runner on browser 245ea108 | pass for Core3 runtime; paired Odoo comparison blocked because the authenticated Odoo session has no Website app |

Focused result: `bun test ./test/website_page_tracking.integration.test.ts
--timeout 20000` — 3 tests, 22 assertions; full Website suite — 27 tests, 145
assertions; `git diff --check` passed. This checkpoint advances the bounded
slice only and does not sign off the Website module.

## Reviewer disposition — candidate `760f171f`

- Integrated on the active branch as `b6cda7b6`; the bounded change adds the
  declared Menu Editor column `Edit` action and its contract assertion.
- Post-merge verification passed: Menu Editor 5 tests / 20 assertions, the
  broader Website slice 20 tests / 97 assertions, Website UI audit, Website
  Sass build, and `git diff --check`.
- Recorded authenticated Core3 evidence covers desktop edit/save/reload,
  second-site persistence, mobile `More actions` without overflow, dispatcher
  403, and publish → unpublish → publish HTTP 200 lifecycle refreshes.
- Paired authenticated Odoo visual comparison remains blocked. Website is
  **conditional / not signed off**; broader module gates remain open.

## 2026-09-21 Analytics checkpoint

The bounded Analytics contract/data slice passes its focused tests and diff
check. It is not a module sign-off: Odoo Website is unavailable in the shared
authenticated session, and Core3 browser verification is blocked by unrelated
CRM YAML discovery failures. Diagnostic desktop/mobile captures are retained
outside Git under `/tmp/core3-odoo-parity/` and referenced in the feature
evidence folder.

## 2026-09-13 coordinator dispatch: next bounded wave

- Existing owner: `agent/odoo-website-dev2-menu-editor`, worktree
  `/home/nhanjs/projects/core3-worktrees/odoo-website-dev2-menu-editor`,
  base `760f171f`. Development event: `DEV-WEBSITE-WAVE-20260913`; QA event:
  `QA-WEBSITE-WAVE-20260913`; handoff commit `104e2835`.
- Candidate is pending. Target is one bounded Menu Editor scope/replay or
  actor-boundary repair. Focused tests, audit, CSS/frontend build, scoped
  ESLint, and diff-check are required before triggering existing QA.
  Aggregate progress remains untouched.
## 2026-09-13 coordinator reactivation

- Existing owner `agent/odoo-website-dev2-menu-editor` is reactivated on the
  same worktree for one concrete lifecycle/asset/Menu Editor scope, replay,
  or actor-boundary repair with focused regression coverage.
- Existing development event `DEV-WEBSITE-WAVE-20260913` and QA event
  `QA-WEBSITE-WAVE-20260913` remain assigned. Candidate is pending; no
  aggregate progress change.
## 2026-09-13 owner checkpoint

- `7919d102` and `8b05d448` are dispatch/checkpoint commits only; no product
  candidate has been submitted. QA remains untriggered pending a self-contained
  implementation commit and evidence.
## 2026-09-13 poll after `8b05d448`

- No product diff exists after the checkpoint; owner was re-prompted. QA event
  remains untriggered pending implementation and focused tests.
