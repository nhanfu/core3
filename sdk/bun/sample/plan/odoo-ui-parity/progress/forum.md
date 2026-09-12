# forum parity progress

Module owner: forum module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: in-progress
Verification trigger: feature-complete
Candidate commit: pending developer commit

## Current state

The current developer wave adds permissioned question editing and manager-only
archiving to the existing Forum Questions and Question Detail surfaces. No
module-completion claim is made here.

## Developer wave evidence — 2026-09-13

- Forum focused corpus: 8 tests passed, 56 assertions, 0 failures.
- Edit persists title/content/tags and increments `row_version`; stale and
  blank-title writes are rejected.
- Archive is terminal, requires `forum.manage`, rejects a `forum.write` actor,
  and persists the archived state and version.
- Browser mutation, restart/migration, full actor/company, answer, asset,
  import/export/print, Temporal, and paired Odoo gates remain open.

## Next bounded task

QA should verify the committed edit/archive candidate in authenticated desktop
and mobile browsers, then run the remaining Forum actor and persistence gates.
