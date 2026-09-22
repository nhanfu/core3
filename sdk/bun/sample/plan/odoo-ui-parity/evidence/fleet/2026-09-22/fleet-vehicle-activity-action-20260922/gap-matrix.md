# Gap matrix

| Gap | Classification | Evidence | Status |
| --- | --- | --- | --- |
| Vehicles action had no Activity mode | functional/UI | `pages/vehicles.yaml`, focused test | fixed |
| Activity data had no durable Fleet storage | data | migrations `044` and `045` | fixed |
| Activity scheduling lacked Fleet guards | permission/workflow/security | `schedule_fleet_vehicle_activity` and mutation assertions | fixed |
| Existing visual regression expected only two modes | regression | `fleet_vehicles_visual.integration.test.ts` updated to the new source-backed order | fixed |
| Authenticated Odoo tab could not be borrowed | visual | `browser-agent-window-blocker.png`, `verification.md` | blocked |
| Authenticated Core3 Activity capture | visual/responsive | No authenticated runtime/session available in this worktree | blocked |
| Odoo Pivot mode | functional | Outside this bounded Activity feature; existing plan scope remains open | deferred, not claimed |
