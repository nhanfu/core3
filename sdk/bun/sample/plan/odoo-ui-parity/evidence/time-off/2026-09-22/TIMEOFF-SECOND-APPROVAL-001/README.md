# TIMEOFF-SECOND-APPROVAL-001

Bounded feature: Odoo `hr.leave` two-level approval workflow.

This slice adds the source-backed `confirm -> validate1 -> validate` behavior as
Core3 `Submitted -> Second Approval -> Approved`, with separate manager-only
Approve and Validate actions, durable first/second approver audit metadata,
balance application at final validation, row-version guards, and restart
persistence.

Evidence map:

- `odoo-analysis.md`: local Odoo 19 source and live-reference observations.
- `functionality-checklist.md`: feature acceptance cases and results.
- `source-comparison.md`: Odoo/Core3 source contract comparison.
- `gap-matrix.md`: bounded gap and implementation mapping.
- `menu-action-inventory.md`: owning menu, actions, views, and route mapping.
- `test-results.md`: focused and regression test output.
- `verification.md`: runtime/browser verification and exact blockers.

No desktop/mobile visual-parity capture is claimed. The authenticated
`core3_reference` session has no installed Time Off menu or `hr_holidays`
action; direct Time Off URLs resolve to Discuss. Core3 browser binding was not
used as visual evidence after the source/API tests because the live runtime
gate was not available for a clean authenticated comparison.
