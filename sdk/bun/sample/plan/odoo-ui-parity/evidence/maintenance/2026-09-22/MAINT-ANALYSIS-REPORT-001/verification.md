# Verification

## Odoo reference

BrowserSkill instance `245ea108` reached the authenticated Odoo route
`http://localhost:8069/odoo/maintenance-requests-analysis` in database
`core3_reference`. The desktop observation showed Graph and Pivot controls;
the Pivot Measures menu showed Duration, Repeat Every, and Count. The mobile
observation at 390x844 loaded the source Kanban fallback. Reference captures
are present in this folder.

## Core3 runtime

The single-module runtime started successfully at
`http://127.0.0.1:4325` and `/api/modules` returned the Maintenance module,
including `maintenance-analysis`. A BrowserSkill task-created tab navigated to
the report route but rendered the Core3 login page. Borrowing the existing
authenticated user tab remained pending under the extension’s confirmation
policy, so no authenticated Core3 report state could be exercised or captured.

This is an authentication/session-access blocker, not a runtime startup
failure. Core3 visual parity, browser persistence, and responsive comparison
are intentionally not claimed. The feature’s service persistence and restart
evidence are covered by the focused integration test.
