# sms-marketing parity progress

Module owner: sms-marketing module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: active - bounded QA executed; sign-off gates remain open
Verification trigger: focused contract suite and module audit
Candidate commit: this module-owned commit

## Current state

The campaign list/detail contract, deterministic fixtures, and mailing-list,
contact, and analysis slices are present in the active checkout. This wave
adds the manager-only `Sending -> Sent` completion action and optimistic
row-version guards for every campaign lifecycle transition. Focused lifecycle
tests cover durable state, delivery counters, and stale-transition rejection.
No authenticated visual-parity claim is made here.

## Next bounded task

Dispatch QA on the committed lifecycle candidate, then exercise authenticated
campaign workflows and company/actor boundaries before updating module sign-off.

## QA checkpoint (2026-09-13, candidate `7db5dde23c1258861fdd59341aff4d98e73782f0`)

Focused SMS regression passed: 13 tests / 93 expectations / 0 failures. The
contract suite covers schedule → send → complete, stale completion rejection,
row-version persistence, and the manager-only completion action. Core3
authenticated desktop route/detail rendering also passed with no page/request
errors or horizontal overflow; capture is recorded in the QA ledger.

The real browser transition sequence hung during post-Schedule reload and was
stopped. Mobile, browser actor/company permissions, reload/restart persistence,
and paired authenticated Odoo evidence remain unverified. This checkpoint is
evidence only and does not sign off the module.
