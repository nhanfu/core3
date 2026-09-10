# Maintenance parity batch 2

Implemented on the isolated `agent/odoo-ui-maintenance` worktree.

## Scope

- Restored the Odoo Maintenance menu tree and labels: Dashboard, Maintenance
  Requests, Maintenance Calendar, Equipment, Maintenance Requests Analysis,
  Maintenance Teams, Equipment Categories, and manager-only Settings.
- Added page-id-owned API fragments for dashboard cards, calendar/reporting,
  teams, categories, and settings. Page YAML remains presentation-only.
- Added deterministic, service-owned team/category/settings fixtures with
  stable IDs, fixed timestamps, idempotent migrations, active/archived fields,
  row versions, and manager/settings permissions.
- Added Odoo-style visible view tabs for request/calendar/reporting/team/category
  surfaces, with desktop-only analytical views and mobile card fallbacks.
- Added team/category create and edit mutation contracts, archive/reopen
  contracts, settings save contract, stable empty-result fixtures, transport
  error contracts, and focused integration coverage.
- Added the manager-only Odoo `hr_equipment_stage_action` at
  `/maintenance-stages`, with list/kanban/form views, page-id-owned API
  sources, deterministic stage fields, CRUD, search, empty/error states,
  duplicate and linked-request delete guards, and optimistic concurrency.

## Deliberate limitations

This is not full Maintenance parity. Followers/chatter/attachments, activity
CRUD, recurrence generation, full equipment CRUD, linked-record delete guards,
record-rule/company filtering, and the OEE/Losses actionless source menu
entries remain deferred. Activity Types remains hidden because the Odoo addon
marks it `base.group_no_one`; Maintenance Stages is exposed to Core3 managers
under the same manager permission boundary.

The Odoo 19 addon is installed with demo data in the personal reference
database as of 2026-09-10, so authenticated comparison captures are available:

- Odoo desktop/mobile: `/tmp/odoo-maintenance-*.png`
- Core3 desktop/mobile captures are produced during the final browser audit
  under `/tmp/core3-maintenance-batch2/` and are intentionally untracked.

The reference is local and revision-specific (`65975996`); it does not prove
behavior of other Odoo versions or a clean database without the installed
addon.

## Verification record

- Focused `maintenance.integration.test.ts` covers page/API ownership, menu
  labels, view tabs/mobile fallbacks, deterministic migrations, fixture search
  and empty states, permissions, error boundaries, and fixed-date checks.
- Final handoff records the exact focused test, audit/schema/lint/diff results,
  authenticated 1440x900 and 390x844 browser checks, and the commit hash.
