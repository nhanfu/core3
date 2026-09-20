# appraisals QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/appraisals-desktop.png and appraisals-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: qa-in-progress
QA slot: dispatchable appraisals assignment (pending wave dispatch)
Module owner: appraisals module owner
Verification trigger: feature-complete
Candidate commit: 7e57913dc7cecc3f4ce075baff60dbea9b228a2b

## Current-wave browser attempt (2026-09-20)

- The authenticated desktop probe used Core3 admin@tms.local at 1440x900.
  /appraisals rendered five deterministic records with visible List, Kanban,
  and New appraisal controls.
- A normal double-click on Draft record appraisal-demo-001 reached
  /appraisals/appraisal-detail?id=appraisal-demo-001. After the scoped page
  contract fix, the detail form visibly exposed Edit, Start, and Cancel.
- No current-wave screenshot was written: the runtime became unavailable before
  the CRUD/workflow interaction and capture pass, so no invalid visual artifact
  is claimed. The prior 2026-09-12 images remain route smoke only.
- The concrete blocker was reproducible: the frontend at
  http://127.0.0.1:3002/login returned the TMS shell without an email input,
  while http://127.0.0.1:3001/api/modules returned connection refused.
  Consequently, fresh authentication, mobile 390x844, browser create/edit,
  and browser workflow transitions were not executable in this attempt.

## Odoo reference re-audit (2026-09-20)

Authenticated http://localhost:8069 in core3_reference reached /odoo/discuss.
ir.module.module returned hr_appraisal id 699, short description Appraisal,
state uninstallable, and no latest version; the corrected ir.ui.menu search
returned zero records. There is no live Appraisals action/view surface to
pair, so paired Odoo parity is explicitly not claimed.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| APP-PAGE-001 | Page/API contracts join by page.id; visible List/Kanban tabs and all analysis sources are declared | test/appraisals.integration.test.ts; candidate cca3203a | pass |
| APP-FUNC-001 | Idempotent migrations, all five workflow states, create/edit/stale-write guards, guarded transitions, completion requirements, delete protection, and permission declarations | bun test ./test/appraisals.integration.test.ts --timeout 20000 — 2 passed / 35 assertions | pass |
| APP-BROWSER-001 | Authenticated Core3 desktop list/detail route and bound detail controls | Desktop route observation above; no current screenshot; backend later refused connections | partial / blocked |
| APPRAISALS-PENDING-001 | Authenticated Core3 CRUD/workflow browser matrix at desktop/mobile and paired Odoo comparison | Backend connection refused; Odoo addon uninstallable with zero menus | blocked |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| APP-BROWSER-BLOCK-001 | Core3 backend at 127.0.0.1:3001 unavailable while Vite frontend remained at 127.0.0.1:3002 | This ledger, 2026-09-20 | current evidence commit | retry isolated runtime before browser sign-off | open |

## Sign-off

- Functional: pass for focused repository/API contract cases; browser interaction remains open
- Permissions: pass for declared action boundaries and workflow permissions; authenticated actor matrix remains open
- Persistence/data integrity: pass for focused migration/CRUD/workflow/concurrency cases
- Desktop/mobile visual parity: blocked; no current-wave captures
- Tester decision: conditional; no module sign-off
