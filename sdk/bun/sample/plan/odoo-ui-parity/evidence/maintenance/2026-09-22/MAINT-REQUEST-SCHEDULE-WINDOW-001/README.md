# MAINT-REQUEST-SCHEDULE-WINDOW-001

This folder records the bounded Maintenance request schedule-window slice.
It does not sign off the Maintenance module or claim full visual parity.

- Source: Odoo 19 `maintenance.request.schedule_end` and computed `duration`
  in `addons/maintenance/models/maintenance.py` and
  `addons/maintenance/views/maintenance_views.xml`.
- Core3: durable `scheduled_end` and `duration` fields, source-aligned
  one-hour default, guarded create/edit updates, calendar end times, and
  persisted analysis duration.
- Test: `test/maintenance_request_schedule_window.integration.test.ts`.
- Browser boundary: the authenticated user tab could not be borrowed after
  the required confirmation remained pending; no visual-parity claim is made.

Remaining gaps include complete authenticated desktop/mobile route evidence,
broader Odoo schedule widget behavior, and whole-module sign-off.
