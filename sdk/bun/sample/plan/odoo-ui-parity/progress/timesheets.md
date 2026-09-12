# timesheets parity progress

Module owner: timesheets module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: current working tree

## Current state

The focused Timesheets suite passes 26 tests across 8 files with 273
assertions. The initial authenticated matrix covered 13 routes at desktop and
mobile; Timesheet Analysis exposed a missing API pivot declaration, which was
fixed by adding `pivot.fields` and reverified with authenticated Pivot/Graph/List
rendering without failures. A fresh authenticated mutation smoke also completed
Draft -> Submitted -> Approved, with approval dispatching the Project-owned
hours mutation after assigning its cross-module inputs from the submitted row.
Full parameterized route coverage, role-specific permissions, broader CRUD
persistence, and paired Odoo comparison remain open. No parity claim is made
here.

## Next bounded task

Run the parameterized detail-route matrix, role-specific permission checks,
authenticated entry CRUD/workflow persistence, and paired Odoo desktop/mobile
captures. Update this file only with evidence from the matching module owner.
