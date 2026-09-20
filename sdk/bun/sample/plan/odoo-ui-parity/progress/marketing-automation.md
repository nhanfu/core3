# marketing-automation parity progress

Module owner: marketing-automation module owner
QA assignment: marketing-automation-qa
Status: implementation-in-progress (source-limited)
Verification trigger: feature-complete
Candidate commit: pending

## Current state

The 2026-09-20 live inventory confirmed that the Odoo module registry marks
`marketing_automation` as `uninstallable`; no Marketing Automation menu,
window action, model, or view is installed in `core3_reference`. The Core3
service is therefore being advanced as an explicitly synthetic equivalent;
no paired Odoo parity claim is made.

Current-wave gap matrix and bounded slice are recorded in
`../marketing-automation.md`. The first slice is automation definition CRUD,
audience enrollment integrity, and existing workflow transitions with
page/API YAML separation.

## Next bounded task

Complete the API/page split and bounded CRUD/enrollment implementation, then
run focused contract/integration tests and authenticated Core3 desktop/mobile
QA where the runtime is available. Update this file only with evidence from
the matching module owner.
