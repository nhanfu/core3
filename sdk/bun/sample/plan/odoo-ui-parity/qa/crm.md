# CRM QA ledger

| Field | Value |
| --- | --- |
| Module | `crm` |
| QA owner | CRM QA |
| Verification trigger | `merge-candidate` |
| Candidate commit | `800384d031d958a041f5688a029d2aab8cde5b88` |
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
| FUNC-AI | Every CRM named action appears in shared AI allowlist | Focused test reports missing `crm.tags.delete` | blocked — `CRM-AI-001` |

## Browser evidence

- Desktop: authenticated `admin@tms.local`, viewport `1440x900`, Core3 route `/crm/leads`; rows and controls rendered without page errors. Screenshot: `/tmp/core3-odoo-parity-crm-leads-desktop.png`.
- Mobile: authenticated `admin@tms.local`, viewport `390x844`, Core3 route `/crm/leads`; CRM navigation and pipeline content rendered. Screenshot: `/tmp/core3-odoo-parity-crm-leads-mobile.png`.
- Create form: authenticated admin entered lead data through normal browser controls; mutation response was HTTP 200. Screenshot: `/tmp/core3-odoo-parity-crm-lead-created-desktop.png`.
- Browser console had no page errors; the favicon 404 is an unrelated missing asset warning.

## Candidate re-test evidence (800384d0)

- Focused: `bun test test/crm.integration.test.ts` — **30 pass, 2 fail**, 467 assertions. The two failures are existing AI-catalog checks for missing `crm.tags.delete`; the conversion tests pass.
- Related: `bun test test/crm*.integration.test.ts test/base_contact_tags.integration.test.ts` — **62 pass, 2 fail**, 467 assertions. Failures are the same `crm.tags.delete` AI-catalog gaps.
- Conversion: separate CRM/Base DuckDB happy path calls `yaml.service.base` / `base.contacts.create_from_crm`, persists `crm-lead-contact-lead-new-contact`, links the CRM lead, and records the completed activity. Contract checks confirm `crm.write` plus `base.contacts.write`, required-name guard, and duplicate email/CRM-link guard. Duplicate conversion, denied Base permission at execution time, downstream failure rollback, and cross-database atomicity are not proven.
- Static: `bun run audit` passed (`647` pages, `662` routes, `1112` datasources); full `bun run lint` completed with no reported errors; `bun run css:build:crm` passed; `git diff --check` passed. TypeScript was attempted from the wrong package root and stopped as an unverified/hanging probe; no TypeScript result is claimed.
- Browser/Odoo: no authenticated desktop/mobile browser run or fresh Odoo capture was available in this bounded attempt. Existing prior captures only: `/tmp/core3-odoo-parity-crm-leads-desktop.png`, `/tmp/core3-odoo-parity-crm-leads-mobile.png`, `/tmp/core3-odoo-parity-crm-lead-created-desktop.png`.

## Re-test and blockers

| Bug | Owner | Required repair | Status |
| --- | --- | --- | --- |
| `CRM-FUNC-001` | CRM owner / shared runtime owner | Normalize empty optional number/date form values to null/default before insert | open |
| `CRM-BOUNDARY-001` | CRM owner with Base contract | Add an allowlisted Base contact-create operation or a durable cross-service workflow; CRM cannot edit Base tables directly | resolved for tested happy path; duplicate/permission/failure atomicity execution remains unproven |
| `CRM-AI-001` | Main agent / AI owner | Add `crm.tags.delete` to `services/ai/agent.yaml` and regenerate catalog evidence | open |
| `CRM-REF-001` | QA/main agent | Authenticate the installed Odoo reference and capture matching routes at `1440x900` and `390x844` | open; no browser/Odoo run available in bounded QA |

## Sign-off

Not signed off. Happy-path cross-service conversion and related regression evidence passed, but duplicate/permission/failure atomicity execution, AI catalog consistency, TypeScript verification, and fresh authenticated desktop/mobile/Odoo evidence remain open.
