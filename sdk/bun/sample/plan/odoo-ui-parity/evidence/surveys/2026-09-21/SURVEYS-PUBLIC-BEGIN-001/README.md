# SURVEYS-PUBLIC-BEGIN-001

This evidence records the bounded implementation of Odoo's public
`survey_begin` lifecycle: an existing `New` answer token becomes `In Progress`
and receives the first ordered question cursor.

- Core3 contract/persistence/restart/concurrency proof:
  `test/surveys_public_begin.integration.test.ts`.
- Core3 viewport artifacts are the `core3-*.png` and `core3-*.json` files.
- Odoo comparison artifacts are the `odoo-8069-*` and `odoo-*` files.
- `core3-runtime-blocker.json` records the exact runtime blockers.

These artifacts are evidence, not sign-off: authenticated Core3 route
registration and a mutable Odoo answer fixture were unavailable in this run.
