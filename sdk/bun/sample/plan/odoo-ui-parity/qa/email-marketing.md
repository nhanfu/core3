# email-marketing QA ledger

## Representative browser matrix (2026-09-12)

- Trigger: post-merge repository regression smoke.
- Coverage: one registered module route, authenticated Core3, desktop 1440x900 and mobile 390x844.
- Result: desktop and mobile render passed with no blank/redirect result, recorded page/request error, or horizontal overflow.
- Artifacts: /tmp/core3-odoo-parity/module-matrix-20260912/email-marketing-desktop.png and email-marketing-mobile.png.
- Boundary: this is route/render smoke evidence only; it does not sign off the complete menu tree, CRUD, permissions, workflows, persistence, or paired Odoo visual parity.

QA state: dormant
QA slot: dispatchable email-marketing assignment (pending wave dispatch)
Module owner: email-marketing module owner
Verification trigger: feature-complete
Candidate commit: none

## Current regression evidence (2026-09-13)

- Focused Email Marketing suite: `bun test ./test/email_marketing*.integration.test.ts --timeout 20000` — 46 passed, 454 assertions, 0 failed across 14 files.
- Isolated runner `:4319` rendered the authenticated Campaigns list at desktop
  1440x900 and mobile 390x844; seeded Draft, Scheduled, Sending, and Sent
  records were visible with no page errors, failed requests, or horizontal
  overflow. Captures: `/tmp/core3-odoo-parity/email-campaigns-desktop.png` and
  `email-campaigns-mobile.png`.

Detailed execution matrix: [`test-plans/email-marketing.md`](test-plans/email-marketing.md). It is the module-level source for campaign, mailing, contact, reporting, actor, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| EMAIL_MARKETING-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |
| EMAIL_MARKETING-FUNC-001 | Campaign, mailing, contact, reporting, configuration, and trace contracts | Focused suite 46/46, 454 assertions across 14 files | pass for tested contracts |
| EMAIL_MARKETING-BROWSER-001 | Authenticated Campaigns list at desktop/mobile | Isolated runner `:4319`; seeded states rendered without errors or overflow; captures recorded above | pass for Core3 runtime; paired Odoo comparison and browser mutations remain open |

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
