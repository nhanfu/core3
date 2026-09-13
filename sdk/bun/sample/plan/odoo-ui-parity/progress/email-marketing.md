# email-marketing parity progress

Module owner: email-marketing module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: dormant
Verification trigger: feature-complete
Candidate commit: none

## Current state

This module is registered in odoo-parity-plan.md but has not yet produced a
current-wave candidate or verified evidence in the active checkout. No parity
claim is made here.

## Next bounded task

Record the complete Odoo menu/action/view inventory, implement the module
functionality, and dispatch QA on the first committed candidate. Update this
file only with evidence from the matching module owner.

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
