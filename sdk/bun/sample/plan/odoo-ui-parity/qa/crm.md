# CRM QA ledger

| Field | Value |
| --- | --- |
| Module | `crm` |
| QA owner | CRM QA |
| Verification trigger | `merge-candidate` |
| Candidate commit | `0d9e223b` (implementation `1824e718`) |
| Runtime | Core3 full memory runtime, backend `http://127.0.0.1:3001`, frontend `http://127.0.0.1:3002`, authenticated `admin@tms.local` |
| Odoo reference | not freshly authenticated in this slice |
| Result | `bounded QA complete; not signed off` |

## Current continuation evidence — 2026-09-20

The selected source-backed gap was Odoo's `crm_case_form_view_salesteams_opportunity`
action from `addons/crm/views/crm_team_views.xml`. Core3 implements it as the
team-detail Opportunities stat action plus the joined page/API contracts at
`services/crm/pages/team-opportunities.yaml` and
`services/crm/api/team-opportunities.yaml`; it intentionally has no new
manifest menu because the Odoo source action is a team-context drill-down.

| Check | Evidence | Result |
| --- | --- | --- |
| Contract/discovery | `bun test test/crm_team_opportunities.integration.test.ts` — 2 pass, 17 assertions | pass |
| Existing adjacent action | `bun test test/crm_team_opportunities.integration.test.ts test/crm_team_members.integration.test.ts` — 4 pass, 34 assertions | pass |
| CRM regression | `bun test test/crm.integration.test.ts` — 46 pass, 222 assertions | pass |
| Persistence/restart | File-backed DuckDB is migrated, created/edited/assigned, closed, reopened, migrated again, and queried for the same row/version/team | pass |
| Static audit | `bun run audit` — 665 pages, 674 routes, 1,176 datasources; targeted ESLint passed; `git diff --check` passed | pass |
| Implementation/hardening commits | `1824e718` implementation; `0d9e223b` restart-proof test and plan evidence | pass |

Authenticated Core3 browser evidence used `admin@tms.local` on the memory
runtime at `http://127.0.0.1:3002`:

- Team detail `/crm/team-detail?id=crm-team-enterprise` exposed the
  Opportunities stat and clicking it reached
  `/crm/team-opportunities?team_id=crm-team-enterprise` with the expected
  Enterprise-scoped cards.
- Desktop `1440x900`: HTTP 200, zero console/page/request failures, body and
  document width 1440. Capture:
  `/tmp/core3-odoo-parity/team-opportunities-desktop-1440x900.png`, SHA-256
  `6e4ce134ba352681ec642ea3067d447aa2e3483052a049d246bba485ff1f83c1`.
- Mobile `390x844`: HTTP 200, zero console/page/request failures, body and
  document width 390. The Kanban board is horizontally scrollable at this
  breakpoint, and the list surface retains more columns than the viewport;
  this is recorded as a responsive follow-up rather than a mobile-fit
  sign-off. Capture:
  `/tmp/core3-odoo-parity/team-opportunities-mobile-390x844.png`, SHA-256
  `734302699a7888c5a3e51ea1ed47157b1387fcfb35dcef90f5150e5a7ce87ec1`.
- Mobile List view also rendered all three rows with zero failures; its
  horizontally scrollable table is retained as responsive follow-up evidence.
  Capture:
  `/tmp/core3-odoo-parity/team-opportunities-list-mobile-390x844.png`, SHA-256
  `3ecfff59590df733e1d01bfc827449ebd5a44f54f91ada81bab7a2fb7d68b26b`.

The installed Odoo reference was not freshly authenticated in this run, so no
paired Odoo visual claim is made. The session did not expose the requested
interactive `js_repl`; equivalent local Playwright execution supplied the
authenticated Core3 evidence above.

Current disposition: the team-opportunity gap is a bounded pass, while the
overall CRM ledger remains conditional and unsigned-off because the broader
CRM actor matrix and paired Odoo comparison are still open.

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

## Reviewer reconciliation `31fd1443`: conditional bounded PASS (2026-09-13)

- The existing CRM owner/worktree was valid at
  `/home/nhanjs/projects/core3-worktrees/odoo-crm-wave-20260912`. The AI
  YAML-context implementation was already present on active with the stronger
  64-entry allowlist; only the candidate regression assertion was new and was
  integrated as `56110795`.
- Post-merge CRM verification passed **45 tests / 212 assertions**; related
  CRM/Base verification passed QA's **72 tests / 507 assertions**. Audit passed
  **661 pages / 670 routes / 1,158 datasources**; frontend build and diff-check
  passed. QA reports lint clean.
- Accepted evidence covers CRM/Base conversion, AI YAML context, duplicate,
  invalid, missing, stale, permission, rollback, desktop/mobile browser, and
  reload behavior.
- Disposition: **conditional bounded PASS; reconciled**. File-backed restart
  durability and authenticated Odoo comparison remain open. No full CRM
  sign-off.

## QA checkpoint — Lead Mining Requests (2026-09-21)

Conditional bounded result; not signed off.

- Duplicate `crm_lead_mining_teams` discovery issue resolved; no such ID
  remains in CRM fragments. Focused test passed 2 tests / 26 assertions.
- UI audit passed: 772 pages / 781 routes / 1,582 datasources. Diff-check and
  focused ESLint passed.
- Full CRM passed 45 / failed 1 (222 assertions); the failure is the AI
  allowlist invariant for the four new named actions. No AI file was changed
  because this handoff is CRM-only.
- Odoo authenticated desktop/mobile/list-form captures exist; Core3 bsk
  rendered only an empty shell, so no Core3 visual parity claim is made.
- Evidence: `odoo-ui-parity/evidence/crm/2026-09-21/CRM-LEAD-MINING-REQUESTS-001/verification.md`.

## Similar Leads stat action — `CRM-LEAD-DUPLICATES-001` (2026-09-22)

- Source comparison: pass. Odoo 19 `crm_lead_views.xml` binds the
  `action_show_potential_duplicates` stat action to `duplicate_lead_count`,
  while `crm_lead.py` computes email-domain, normalized-phone, and commercial
  entity matches. Core3 previously had no duplicate stat/datasource/action;
  its existing bulk merge action is separate and unchanged.
- Product verification: pass. Separate page/API contracts use
  `page.id: crm-lead-duplicates`; CRM migration `0.0.30` is idempotent and
  restart coverage preserves the existing deterministic matching records. Focused
  test: **2 tests / 13 assertions**. Scoped `git diff --check`: pass. The
  repository audit is blocked by unrelated Events page definitions
  (`upload_event_badge_background` and unregistered `FormSection`).
- Broader CRM verification: **47 pass / 1 fail / 236 assertions**. The one
  failure is the existing Lead Mining Requests AI allowlist invariant for four
  CRM actions; `services/ai` is outside this CRM-only change and was not edited.
- Odoo evidence: the authenticated bsk session on `245ea108` reached
  `http://localhost:8069/odoo`, but `core3_reference` has no CRM launcher and
  `/odoo/crm` falls back to Discuss. Desktop/mobile blocker captures are
  recorded in the evidence directory and remain outside Git.
- Core3 browser evidence: blocked before authentication/rendering because the
  shared runtime stopped during page discovery on unrelated Events definitions:
  `upload_event_badge_background` is missing and `FormSection` is unregistered.
  No Core3 visual parity claim is made. The bsk session was stopped cleanly.

Disposition: conditional bounded implementation; not CRM sign-off.
