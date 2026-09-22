# MAINT-REQUEST-INSTRUCTIONS-001

This folder records the bounded Maintenance request Instructions slice. It is
not Maintenance module sign-off or a claim of full Odoo visual parity.

- Source: Odoo 19 `maintenance.request.instruction_type`,
  `instruction_text`, `instruction_google_slide`, and the Instructions
  notebook in `addons/maintenance/views/maintenance_views.xml`.
- Core3: durable text/Google Slide instruction modes, page-id-owned guarded
  update action, deterministic migration backfill, and restart persistence.
- PDF upload remains an explicit follow-up because this slice does not claim a
  binary instruction storage or viewer contract.
- Test: `test/maintenance_request_instructions.integration.test.ts`.
