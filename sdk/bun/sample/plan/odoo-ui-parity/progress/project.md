# project parity progress

Module owner: project module owner
QA assignment: dispatchable QA slot (wave assignment pending)
Status: qa-in-progress
Verification trigger: feature-complete
Candidate commit: current working tree

## Current state

The focused Project suite passes 44 tests across 15 files with 506 assertions.
Authenticated module-scoped probes loaded seeded dashboard, milestone,
activity, and portal screens; Fleet was denied `project.settings` with HTTP
403. The isolated runner namespaces routes under `/project`; properly
namespaced Project list, detail, dashboard, and configuration routes loaded
cleanly. `/project/tasks/detail` still requires the unregistered
`yaml.service.timesheets` dependency because the runner loads only Project plus
Auth. Full-process/dependency-aware task retest and paired Odoo comparison
remain open. No parity claim is made here.

## Next bounded task

Retest Project in the full process, repair the route collision and cross-service
runner dependency, then run authenticated CRUD/workflow checks and paired Odoo
desktop/mobile captures. Update this file only with evidence from the matching
module owner.
