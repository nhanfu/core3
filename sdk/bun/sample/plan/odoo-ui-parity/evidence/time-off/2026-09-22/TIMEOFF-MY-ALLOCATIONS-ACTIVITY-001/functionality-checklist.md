# Functionality checklist

| Case | Class | Acceptance | Result |
| --- | --- | --- | --- |
| ACT-001 | functional | `/my-allocations` exposes List, Cards, and Activity tabs with visible labels and the seven Odoo activity types | pass |
| ACT-002 | data | API and page use `page.id: my-allocations`; seeded activity slots query from durable DuckDB data | pass |
| ACT-003 | workflow | `time_off.write` scheduling updates the slot and refreshes activity state/count | pass |
| ACT-004 | security | Activity scheduling is permissioned and scoped to Admin User allocations; cancelled/foreign slots are rejected | pass at mutation contract level |
| ACT-005 | validation | Invalid activity type, blank/oversized summary, invalid ISO due date, missing slot, and stale row are rejected deterministically | pass; focused test covers type/date/stale |
| ACT-006 | persistence | Migration replay is idempotent and a scheduled activity survives file-backed close/reopen | pass |
| ACT-007 | responsive | Activity is desktop-only, matching the source Activity mode; Core3 mobile visual check | blocked by Core3 runtime |
| ACT-008 | visual | Authenticated Odoo/Core3 desktop/mobile comparison | blocked: `core3_reference` has no Time Off surface and Core3 server cannot start |
