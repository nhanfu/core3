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
