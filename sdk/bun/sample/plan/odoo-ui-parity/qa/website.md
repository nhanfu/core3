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
| WEBSITE-PUBLIC-001 | Published-only public page visibility | `website_public.integration.test.ts`; published home resolves by path/list/id while draft Contact us is absent and unsupported methods return 405 | pass for service/API boundary |
| WEBSITE-UI-005 | Public Website page route/render seam | `website_public.integration.test.ts`; `/website/page?path=...` is registered and the component uses `@core3/client/html` with published API data | pass for implementation contract; authenticated browser capture remains planned |
| WEBSITE-FUNC-001 | Website Homepage/Page Manager/public boundary suite | `bun test ./test/website*.integration.test.ts --timeout 20000` — 9 tests, 44 assertions | pass for focused scope |
| WEBSITE-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| — | Full module QA has not run | — | — | pending |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
