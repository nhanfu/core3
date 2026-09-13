# CRM QA ledger

| Field | Value |
| --- | --- |
| Module | `crm` |
| QA owner | CRM QA |
| Verification trigger | `merge-candidate` |
| Candidate commit | `b70a3930c7ab0e3c8052f51a8d413ff50b0f8854` |
| Runtime | Core3 full memory runtime, `http://127.0.0.1:4012`, authenticated `admin@tms.local` |
| Odoo reference | not freshly authenticated in this slice |
| Result | `bounded QA complete; not signed off` |

## Functional test cases

| ID | Check | Evidence | Result |
| --- | --- | --- | --- |
| FUNC-READ | Authenticated `/crm/leads` list renders deterministic CRM rows, filters, view tabs, and workflow controls | Browser body text and `/tmp/core3-odoo-parity-crm-leads-desktop.png` | pass |
| FUNC-CREATE | Create a lead through the authenticated form with name, email, numeric values, and expected closing date | `/api/mutate` HTTP 200; response id `03bf5ec1-5b4d-4298-a80f-87ad6f8733b3`; `/tmp/core3-odoo-parity-crm-lead-created-desktop.png` | pass with required populated optionals |
| FUNC-CREATE-EMPTY | Create a lead leaving optional numeric/date fields blank | Browser `/api/mutate` HTTP 500: `Could not convert string "" to DECIMAL(18,2)` / invalid date format | fail — `CRM-FUNC-001` |
| FUNC-MEMORY | Run CRM create/read under isolated `duckdb-memory` service databases without direct Base table SQL | `crm.integration.test.ts`: separate CRM/Base DuckDB test invokes `yaml.service.base` `base.contacts.create_from_crm`; canonical contact and CRM link/activity persist | pass for contact-create boundary |
| FUNC-TAGS | Managed tag catalog query, search, active state, create/update/delete contracts | `crm_tags_action.integration.test.ts`, tag assertions in `crm.integration.test.ts` | pass |
| FUNC-AI | Every CRM named action appears in shared AI allowlist | `crm_tags_action.integration.test.ts` static allowlist regression and CRM lifecycle named-action check | pass — `CRM-AI-001` resolved |

## Browser evidence

- Desktop: authenticated `admin@tms.local`, viewport `1440x900`, Core3 route `/crm/leads`; rows and controls rendered without page errors. Screenshot: `/tmp/core3-odoo-parity-crm-leads-desktop.png`.
- Mobile: authenticated `admin@tms.local`, viewport `390x844`, Core3 route `/crm/leads`; CRM navigation and pipeline content rendered. Screenshot: `/tmp/core3-odoo-parity-crm-leads-mobile.png`.
- Create form: authenticated admin entered lead data through normal browser controls; mutation response was HTTP 200. Screenshot: `/tmp/core3-odoo-parity-crm-lead-created-desktop.png`.
- Browser console had no page errors; the favicon 404 is an unrelated missing asset warning.

## Candidate re-test evidence (`b70a3930`)

- Focused: `bun test test/crm.integration.test.ts` — **30 pass, 2 fail**, 467 assertions. The two failures are existing AI-catalog checks for missing `crm.tags.delete`; the conversion tests pass.
- Related: `bun test test/crm*.integration.test.ts test/base_contact_tags.integration.test.ts` — **62 pass, 2 fail**, 467 assertions. Failures are the same `crm.tags.delete` AI-catalog gaps.
- Conversion: separate CRM/Base DuckDB happy path calls `yaml.service.base` / `base.contacts.create_from_crm`, persists `crm-lead-contact-lead-new-contact`, links the CRM lead, and records the completed activity. Contract checks confirm `crm.write` plus `base.contacts.write`, required-name guard, and duplicate email/CRM-link guard. Duplicate conversion, denied Base permission at execution time, downstream failure rollback, and cross-database atomicity are not proven.
- Static: `bun run audit` passed (`647` pages, `662` routes, `1112` datasources); full `bun run lint` completed with no reported errors; `bun run css:build:crm` passed; `git diff --check` passed. TypeScript was attempted from the wrong package root and stopped as an unverified/hanging probe; no TypeScript result is claimed.
- Browser/Odoo: no authenticated desktop/mobile browser run or fresh Odoo capture was available in this bounded attempt. Existing prior captures only: `/tmp/core3-odoo-parity-crm-leads-desktop.png`, `/tmp/core3-odoo-parity-crm-leads-mobile.png`, `/tmp/core3-odoo-parity-crm-lead-created-desktop.png`.
- AI catalog repair: `bun test test/crm_tags_action.integration.test.ts` — **5 pass, 39 assertions**; `crm.tags.delete` is present with route `/api/actions/crm.tags.delete` and permission `crm.manage`. `bun test test/crm.integration.test.ts -t 'keeps every declared CRM named action'` also passes.

## QA retest ledger (2026-09-13)

- Repair contract: **pass** — `bun test test/crm_tags_action.integration.test.ts` returned 5 pass, 0 fail, 39 assertions. This covers tag page/API/detail joins, active/archive filtering, manager CRUD validation and stale/not-found guards, plus the exact AI entry `{id: crm.tags.delete, route: /api/actions/crm.tags.delete, method: POST, permission: crm.manage, preview: false}` and detail action binding with `crm.manage`.
- Named-action regression: **pass** — `bun test test/crm.integration.test.ts -t 'keeps every declared CRM named action'` returned 1 pass, 0 fail, 1 assertion.
- Related CRM/Base regression: **bounded, not green** — the combined CRM/Base run reproduced the pre-existing failure in `CRM YAML lifecycle integration > publishes declared CRM operations to the permissioned AI agent catalog` at `test/crm.integration.test.ts:552` (YAML context expectation). The new named-action test passed; the broader run was stopped before a complete aggregate count was available. Base contact fixture mismatch remains recorded from the candidate evidence and is unrelated to `crm.tags.delete`.
- Static gates: **audit pass** (`UI audit: 647 pages, 662 routes, 1112 datasources`); **targeted lint pass** (`bunx eslint sample/test/crm_tags_action.integration.test.ts` from `sdk/bun`); **diff-check pass** (`git diff --check`, including candidate product files). `bun run lint` from `sample` is invalid because that package has no lint script; repository lint was started from `sdk/bun` but stopped when it did not complete within the bounded retest window.
- Browser/Odoo: **not available for this retest**. The candidate runtime started at backend `http://127.0.0.1:4012` and frontend `http://localhost:4013`; an unauthenticated desktop probe redirected to `/auth/login?redirect=%2Fcrm%2Fleads` and captured `/tmp/core3-crm-retest-desktop-unauth.png`. The authenticated desktop/mobile probe was stopped before returning captures. No fresh Odoo comparison was available. Existing prior authenticated captures remain the only desktop/mobile CRM evidence.

## Re-test and blockers

| Bug | Owner | Required repair | Status |
| --- | --- | --- | --- |
| `CRM-FUNC-001` | CRM owner / shared runtime owner | Normalize empty optional number/date form values to null/default before insert | open |
| `CRM-BOUNDARY-001` | CRM owner with Base contract | Add an allowlisted Base contact-create operation or a durable cross-service workflow; CRM cannot edit Base tables directly | resolved for tested happy path; duplicate/permission/failure atomicity execution remains unproven |
| `CRM-AI-001` | CRM owner / AI catalog owner | Add `crm.tags.delete` to `services/ai/agent.yaml` and regenerate catalog evidence | repair retest pass; broader YAML-context catalog regression remains open |
| `CRM-REF-001` | QA/main agent | Authenticate the installed Odoo reference and capture matching routes at `1440x900` and `390x844` | open; no browser/Odoo run available in bounded QA |

## Sign-off

Not signed off. The singular tag deletion allowlist and binding repair passed focused QA. Broader AI catalog YAML-context regression, incomplete related-suite aggregate, unresolved functional/atomicity coverage, and missing authenticated desktop/mobile/Odoo evidence keep CRM bounded and unsigned-off.

## Reviewer reconciliation — candidate `bc381d4a`

- Integrated on the active branch as `e1be8e05` after resolving the shared
  mutation-runtime type conflict while preserving the active runtime fields.
- The bounded CRM-to-Base conversion cases pass: happy path, duplicate replay,
  Base permission denial, downstream failure compensation, missing source,
  stale source, and contract declaration. The focused selection returned 11
  pass / 101 assertions; the full CRM integration suite returned 45 pass / 211
  assertions; the related CRM suite returned 73 pass / 511 assertions.
- Audit passed with 661 pages, 670 routes, and 1,158 datasources. CRM CSS
  build, changed-file review, and `git diff --check` passed.
- This is a conditional bounded result, not full CRM sign-off. Authenticated
  actor/browser evidence, restart durability, typecheck, and paired Odoo
  comparison remain open gates. No other module was changed by this review.

## Reviewer disposition — candidate `fa7561f3`

- Integrated on the active branch as `b1322f05`; scope is limited to CRM
  Activity Plans list/detail pages, manager-only CRUD and ordered-step guards,
  menu registration, migration backfill, and focused tests.
- Post-merge verification passed: Activity Plans 2 tests / 16 assertions, UI
  audit (661 pages / 670 routes / 1153 datasources), targeted ESLint, CRM CSS
  build, and `git diff --check`.
- Preserved blockers: CRM broader regression remains 38 pass / 1 fail on the
  AI YAML-context expectation; optional numeric/date normalization remains
  open; typecheck and CRM mock-data audits remain blocked; authenticated
  browser and Odoo comparison remain unavailable. CRM is conditional and
  unsigned-off.

## 2026-09-13 coordinator review: candidate `af26e16f`

- Integrated the bounded empty typed-form normalization repair as `d0be043c`.
  The five-file patch is self-contained after resolving one test-file conflict
  by retaining the active authenticated API regression and adding the
  candidate client transport assertions; no unrelated files were imported.
- Post-merge CRM integration test passed **41 tests, 197 assertions**. The
  candidate’s bounded CRM/Base evidence remains **67 pass / 1 known AI
  YAML-context baseline failure**; audit (**661 pages, 670 routes, 1154
  datasources**), CRM CSS, targeted ESLint, and diff-check passed.
- Normalization now covers modal and inline form transport, blank optional
  numeric/date values, numeric comma conversion, and CRM defaults. Odoo
  authenticated HTTP evidence is retained; Core3 API/browser and Odoo visual
  comparison remain unavailable due runtime discovery and missing Playwright.
- CRM remains **conditional / unsigned-off**. The known AI-context baseline,
  broader runtime/browser, and paired visual gates remain open.
## 2026-09-13 coordinator dispatch — bounded conversion boundary wave

- Existing owner `agent/odoo-crm-wave-20260912` is assigned on
  `/home/nhanjs/projects/core3-worktrees/odoo-crm-wave-20260912`, based at
  `af26e16f`. Development event: `DEV-CRM-WAVE-20260913-R2`; QA event:
  `QA-CRM-WAVE-20260913-R2`; handoff commit: `c5c3d6c3`.
- Scope is failure-atomic CRM-to-Base contact conversion beyond the happy
  path: duplicate replay, permission denial, invalid/missing source,
  downstream failure rollback, and stale/concurrent guards, with focused
  tests. Candidate pending; existing ledger, unrelated edits, and aggregate
  progress are preserved.
## QA reconciliation — `DEV-CRM-WAVE-20260913-R2` / `QA-CRM-WAVE-20260913-R2`

- Current authoritative CRM evidence: `bun test test/crm.integration.test.ts`
  passed **41 tests / 197 expect() calls**.
- Existing bounded implementation is present: successful lead conversion is
  declared in `services/crm/api/lead-detail.yaml`, and customer creation uses
  the allowlisted Base service contract in `services/base/api/contacts.yaml`.
- Disposition: **conditional bounded result only**. The CRM-to-Base wave is not
  fully verified because duplicate replay/idempotency, downstream Base failure
  rollback of the CRM lead, and stale/concurrent conversion guards remain
  unproven or missing.
- Explicit runtime blockers remain: authenticated actor/permission execution
  evidence, authenticated desktop/mobile browser parity, and paired Odoo
  comparison. Existing AI YAML-context, mock-data, typecheck, broader CRM
  regression, and full module gates remain open. No full CRM completion or
module sign-off is claimed.

## Capacity-recycle CRM takeover authorization (2026-09-13)

- Authorize only a same-module takeover for the recorded conversion task, in
  the exact inherited worktree `/home/nhanjs/projects/core3-worktrees/odoo-crm-wave-20260912`
  on `agent/odoo-crm-wave-20260912` at `c5c3d6c3`.
- The owner worktree is dirty only in QA/handoff documentation; no product
  changes or visible owner process were found. The takeover must inherit those
  docs and existing CRM-to-Base conversion findings, and must not start a
  parallel implementation or touch other module files.
- Dispatch is not executable in this session because no agent lifecycle handle
  is available. Until a takeover is actually dispatched, CRM remains pending;
  its bounded task is duplicate replay, permission/invalid/missing handling,
  downstream rollback, stale/concurrent guards, and focused tests.
