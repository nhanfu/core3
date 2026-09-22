# Test results

Focused command:

    bun test test/fleet_vehicle_planned_filter.integration.test.ts test/fleet_driver_change.integration.test.ts
    5 pass, 0 fail, 33 expect() calls

Targeted vehicle/model regression command:

    bun test test/fleet_vehicle_planned_filter.integration.test.ts test/fleet_driver_change.integration.test.ts test/fleet_vehicle_activity_action.integration.test.ts test/fleet_vehicle_create.integration.test.ts test/fleet_vehicle_scope.integration.test.ts test/fleet_model_vehicle_create.integration.test.ts
    17 pass, 0 fail, 104 expect() calls

The full `./test/fleet*.integration.test.ts` glob is not clean on the current
checkout: unrelated Event page discovery fails on unknown
`archive_event_detail`/`unarchive_event_detail` actions, and existing
manufacturer/model expectations do not account for the already-present Ranger
Zero fixture. These failures are outside the allowed Fleet change.
