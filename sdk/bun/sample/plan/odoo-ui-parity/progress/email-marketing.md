# email-marketing parity progress

Module owner: email-marketing module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: dormant
Verification trigger: feature-complete
Candidate commit: `54f08872ce52db5c18013430ec694a654a37d2bd`

## Current state

This module is registered in odoo-parity-plan.md but has not yet produced a
current-wave candidate or verified evidence in the active checkout. No parity
claim is made here.

## Next bounded task

Record the complete Odoo menu/action/view inventory, implement the module
functionality, and dispatch QA on the first committed candidate. Update this
file only with evidence from the matching module owner.

## QA verification of candidate `54f08872` (2026-09-13)

- Focused email-marketing regression: **46 passed, 457 assertions, 0 failed**
  across 14 files.
- Candidate recipient slice passed every-recipient validation, CRLF and outer
  whitespace normalization, persisted multiline values, first-address mirror,
  and optimistic stale-row guard. The corpus also passed campaign/mailing
  workflow, contact recipient workflow, eligibility, idempotent persistence,
  and declared permission/error contract checks.
- `bun run audit` passed: 659 pages, 668 routes, 1,139 datasources.
- `git diff --check HEAD^ HEAD` passed. There is no package `lint` script;
  direct ESLint on the changed TypeScript test passed and YAML was ignored by
  configuration with one warning.
- Authenticated isolated runner `:4354` passed the canonical Email Marketing
  Mailings route at 1440x900 and 390x844 with no page/request errors and no
  horizontal overflow. Desktop Test wizard capture passed. Captures are in
  `/tmp/core3-odoo-parity/email-marketing-campaigns-54f08872-desktop.png`,
  `email-marketing-campaigns-54f08872-mobile.png`, and
  `email-marketing-campaigns-54f08872-desktop-test-wizard.png`.
- Odoo `:8069` was reachable but unauthenticated login redirected; no paired
  Odoo capture is claimed. Full actor/company, restart/browser mutation,
  complete route-tree, and paired Odoo gates remain open. No sign-off is made.

## Mailing Test recipient validation hardening (2026-09-13)

The mailing test wizard now validates every newline-delimited recipient
instead of checking only the first address. CRLF input and outer whitespace are
normalized before persistence, while the first normalized address remains
mirrored to `last_test_email` for compatibility. This closes the recipient
eligibility boundary for the sample-mail workflow without sending real mail or
contacting external addresses.

- Changed: `services/email-marketing/api/mailing-detail.yaml`.
- Focused regression: `test/email_marketing_mailings.integration.test.ts` now
  covers an invalid second address, CRLF normalization, persisted multiline
  recipients, and the optimistic stale-row guard.
- Verification: focused mailing suite passes **5 tests, 69 assertions**;
  audit and lint are pending final verification.
- No migration or fixture change; no browser or visual-parity claim.

## Next event: review of `54f08872`

The recipient-validation candidate is ready for central review from existing
owner/worktree `agent/email-marketing-recipient-workflow-20260913` at
`/home/nhanjs/projects/core3-worktrees/email-marketing-recipient-workflow-20260913`.
Review the self-contained mailing-detail YAML/test slice before integration;
the later owner HEAD `826f9556` is dispatch-only and is not the candidate.
Actor/company, restart/browser mutation, complete route-tree, and paired Odoo
gates remain open.

## Review result: `54f08872`

Active already contains the equivalent recipient-validation product tree as
`efe5c846`; the candidate cherry-pick was empty and no duplicate merge was
created. Active focused verification passed 5 tests/69 assertions. The later
owner HEAD `826f9556` remains dispatch-only. Actor/company, restart/browser
mutation, complete route-tree, and paired Odoo gates remain open.
