# Odoo UI parity bug-fix ledger

The single shared tester owns this queue. Every visual mismatch, failed
functional case, regression, or environment blocker that affects sign-off gets
one row. A fix is closed only after the tester reruns the linked test case at
both required viewports when the case is renderable.

| Bug ID | Module | Observed mismatch/failure | Evidence/test case | Owner | Fix commit | Regression test | Retest | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BF-001 | Runtime | Recursive Vite watcher hit `EMFILE`, preventing reliable module captures | UI-002/UI-003; runtime logs | Runtime owner | `b6f4c931` | single-module runner smoke | Core3 Inventory Packages rendered at both viewports; paired Odoo unavailable | resolved for Core3 capture path; Odoo comparison still open |
| BF-002 | Odoo reference | Reference authentication has rejected the documented local credentials in several capture attempts | UI-002/UI-003; temporary login probes | Shared tester | — | — | Reproduce only against the active reference environment | open environment blocker |
| BF-003 | Timesheets | Inline mutation inside the embedded task grid is not yet supported | UI-006; `timesheets.md` | Timesheets agent | — | existing task-context CRUD coverage | pending tester retest | open |
| BF-004 | Base/Contacts | Existing fixture expectation reports an extra `company-northwind` row in an independent test | UI-007/UI-009; Base Contacts test output | Base agent | — | Base Contacts integration test | pending owner fix and tester retest | open |

## Repair protocol

- The tester adds the row before requesting a fix and links the exact capture,
  request/error output, or failing assertion.
- The owning module agent fixes the smallest source-backed cause, adds or
  updates a regression test, and commits source/tests/docs only.
- The tester reruns the affected case plus the module regression suite and
  records the commit and result here.
- Do not close a bug because YAML parses or an endpoint returns 200; rendered
  authenticated evidence is required for visual bugs.
