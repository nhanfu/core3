# timesheets parity progress

Module owner: timesheets module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: current working tree

## Current state

The focused Timesheets suite passes 26 tests across 8 files with 273
assertions. The initial authenticated matrix covered 13 routes at desktop and
mobile; an isolated fresh-page rerun now passes 26/26 route checks with valid
detail IDs and no page/request errors or horizontal overflow. Timesheet Analysis
exposed a missing API pivot declaration, which was fixed by adding `pivot.fields`
and reverified with authenticated Pivot/Graph/List rendering without failures. A fresh authenticated mutation smoke also completed
Draft -> Submitted -> Approved, with approval dispatching the Project-owned
hours mutation after assigning its cross-module inputs from the submitted row.
Role-boundary smoke also confirms that Fleet is denied personal, all-timesheets,
settings, and approval endpoints with the expected 403 permission errors.
Full parameterized route coverage, role-specific permissions, broader CRUD
persistence, and paired Odoo comparison remain open. No parity claim is made
here.

## Next bounded task

Run authenticated entry CRUD/persistence checks beyond the workflow smoke, then
capture paired Odoo/Core3 desktop and mobile evidence for the registered route
set. Update this file only with evidence from the matching module owner.
