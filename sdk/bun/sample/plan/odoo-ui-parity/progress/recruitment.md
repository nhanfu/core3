# recruitment parity progress

Module owner: recruitment module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: current working tree

## Current state

The focused Recruitment suite passes 35 tests across 10 files with 336
assertions. The authenticated module-scoped matrix covers 15 routes at
desktop and mobile; 30/30 passed after an isolated `/openings` retest, which
also confirmed its normalized `/recruitment/openings` alias. Fleet was denied
the manager-only Recruitment settings route with HTTP 403 and no browser
errors. Authenticated CRUD mutation smoke, the full role matrix, and paired
Odoo comparison remain open. No parity claim is made here.

## Next bounded task

Run an authenticated applicant/opening CRUD and workflow smoke, complete the
role-specific permission matrix, and capture paired Odoo desktop/mobile
screens. Update this file only with evidence from the matching module owner.
