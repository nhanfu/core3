# CRM QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/crm-desktop.png and crm-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

| Field | Value |
| --- | --- |
| Module | `crm` |
| QA owner | pending dispatch to QA slot |
| Verification trigger | `merge-candidate` |
| Candidate commit | `3ad8bbd3b1d6649128a20af8fb41ac668ebe8c1c` |
| Runtime | Core3 full memory runtime, `http://127.0.0.1:4012`, authenticated `admin@tms.local` |
| Odoo reference | not freshly authenticated in this slice |
| Result | `tester-failed` |

## Functional test cases

| ID | Check | Evidence | Result |
| --- | --- | --- | --- |
| FUNC-READ | Authenticated `/crm/leads` list renders deterministic CRM rows, filters, view tabs, and workflow controls | Browser body text and `/tmp/core3-odoo-parity-crm-leads-desktop.png` | pass |
| FUNC-CREATE | Create a lead through the authenticated form with name, email, numeric values, and expected closing date | `/api/mutate` HTTP 200; response id `03bf5ec1-5b4d-4298-a80f-87ad6f8733b3`; `/tmp/core3-odoo-parity-crm-lead-created-desktop.png` | pass with required populated optionals |
| FUNC-CREATE-EMPTY | Create a lead leaving optional numeric/date fields blank | Authenticated browser `/api/mutate` HTTP 200; created detail shows Expected revenue `0` and Expected closing `—` | pass after form-runtime normalization |
| FUNC-MEMORY | Run CRM create/read under isolated `duckdb-memory` service databases without direct Base table SQL | Initial run reproduced missing `base_contacts`; CRM lead create/edit/convert reads were removed; contact-create path still writes Base directly | partial — `CRM-BOUNDARY-001` |
| FUNC-TAGS | Managed tag catalog query, search, active state, create/update/delete contracts | `crm_tags_action.integration.test.ts`, tag assertions in `crm.integration.test.ts` | pass |
| FUNC-AI | Every CRM named action appears in shared AI allowlist | `4456e44c` adds `crm.tags.delete`; full regression is green | pass |

## Browser evidence

- Desktop: authenticated `admin@tms.local`, viewport `1440x900`, Core3 route `/crm/leads`; rows and controls rendered without page errors. Screenshot: `/tmp/core3-odoo-parity-crm-leads-desktop.png`.
- Mobile: authenticated `admin@tms.local`, viewport `390x844`, Core3 route `/crm/leads`; CRM navigation and pipeline content rendered. Screenshot: `/tmp/core3-odoo-parity-crm-leads-mobile.png`.
- Create form: authenticated admin entered lead data through normal browser controls; mutation response was HTTP 200. Screenshot: `/tmp/core3-odoo-parity-crm-lead-created-desktop.png`.
- Empty-optionals create: authenticated admin entered only the required lead name; mutation response was HTTP 200 and the created detail rendered numeric default `0` with no closing date. No browser errors were recorded.
- Browser console had no page errors; the favicon 404 is an unrelated missing asset warning.

## Re-test and blockers

| Bug | Owner | Required repair | Status |
| --- | --- | --- | --- |
| `CRM-FUNC-001` | CRM owner / shared runtime owner | Normalize empty optional number/date form values to null/default before insert | fixed in `PageFormModal`; browser retested |
| `CRM-BOUNDARY-001` | Main agent with Base owner | Add an allowlisted Base contact-create operation or a durable cross-service workflow; CRM cannot edit Base files in this isolated assignment | open |
| `CRM-AI-001` | Main agent / AI owner | Add `crm.tags.delete` to `services/ai/agent.yaml` and regenerate catalog evidence | fixed in `4456e44c`; regression retested |
| `CRM-REF-001` | QA/main agent | Authenticate the installed Odoo reference and capture matching routes at `1440x900` and `390x844` | open |

## Sign-off

Not signed off. Functional, cross-service, AI-catalog, and fresh Odoo comparison blockers remain.
