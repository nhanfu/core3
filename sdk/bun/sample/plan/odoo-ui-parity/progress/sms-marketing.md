# sms-marketing parity progress

Module owner: sms-marketing module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: active - lifecycle slice ready for QA review
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
