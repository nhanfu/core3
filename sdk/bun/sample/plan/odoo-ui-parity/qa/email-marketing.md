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

- Focused Email Marketing suite: `bun test ./test/email_marketing*.integration.test.ts --timeout 20000` — 46 passed, 456 assertions, 0 failed across 14 files.
- Isolated runner `:4319` rendered the authenticated Campaigns list at desktop
  1440x900 and mobile 390x844; seeded Draft, Scheduled, Sending, and Sent
  records were visible with no page errors, failed requests, or horizontal
  overflow. Captures: `/tmp/core3-odoo-parity/email-campaigns-desktop.png` and
  `email-campaigns-mobile.png`.
- Regression: the campaign form previously submitted an empty optional
  `scheduled_at` as a string and produced DuckDB HTTP 500. Its YAML field is
  now declared as Core3 `datetime`; the same admin create flow on runner
  `:4321` returned HTTP 200, persisted through reload, and produced no browser
  errors or overflow. Capture: `/tmp/core3-odoo-parity/email-campaign-create-mobile.png`.

Detailed execution matrix: [`test-plans/email-marketing.md`](test-plans/email-marketing.md). It is the module-level source for campaign, mailing, contact, reporting, actor, persistence, Temporal, and paired Odoo gates.

## Test-case inventory

| Test ID | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| EMAIL_MARKETING-PENDING-001 | Complete module functionality, permissions, persistence, and desktop/mobile authenticated browser matrix | No current-wave candidate has been submitted | pending |
| EMAIL_MARKETING-FUNC-001 | Campaign, mailing, contact, reporting, configuration, and trace contracts | Focused suite 46/46, 456 assertions across 14 files | pass for tested contracts |
| EMAIL_MARKETING-BROWSER-001 | Authenticated Campaigns list at desktop/mobile | Isolated runner `:4319`; seeded states rendered without errors or overflow; captures recorded above | pass for Core3 runtime; paired Odoo comparison remains open |
| EMAIL_MARKETING-BROWSER-002 | Campaign create with optional schedule and reload persistence | Isolated runner `:4321`; admin create returned 200, persisted after reload, and produced no errors/overflow; `/tmp/core3-odoo-parity/email-campaign-create-mobile.png` | pass for Core3 runtime |

## Bugs and retests

| Bug ID | Failure | Fix commit | Retest | Status |
| --- | --- | --- | --- | --- |
| EMAIL_MARKETING-BUG-001 | Empty optional `scheduled_at` submitted as `""`, causing DuckDB timestamp conversion HTTP 500 | `c25f33d2` plus current working tree fix | Campaign field now uses `type: datetime`; focused suite 46/46 and browser create/reload retest pass | fixed |

## Sign-off

- Functional: pending
- Permissions: pending
- Persistence/data integrity: pending
- Desktop/mobile visual parity: pending
- Tester decision: not signed off
