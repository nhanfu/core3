# TIMEOFF-MY-ALLOCATIONS-ACTIVITY-001

Bounded feature: My Allocations Activity view and personal activity scheduling.

Result: conditional bounded pass. Core3 contracts, persistence, permissions,
guards, migration replay, and restart tests pass. Paired authenticated Odoo
visual parity is not claimed because the requested `core3_reference` database
does not expose the Time Off application.

Artifacts:

- `odoo-analysis.md`: local Odoo source and authenticated reference result.
- `functionality-checklist.md`: bounded acceptance cases.
- `source-comparison.md`: current Core3 gap and changed paths.
- `gap-matrix.md`: source-to-Core3 mapping.
- `test-results.md`: exact focused/regression/build results.
- `verification.md`: browser and runtime verification, including blockers.
- `odoo-reference-desktop-discuss-menu.png`: authenticated desktop blocker capture.
- `odoo-reference-mobile-discuss-menu.png`: authenticated iPhone-14 blocker capture.

The blocker captures show the authenticated Discuss shell and its app menu;
they are evidence of the missing reference surface, not Time Off parity captures.
No password, cookie, token, or Odoo mutation was recorded.
