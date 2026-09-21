# Functionality checklist

- [x] Compared local Odoo model and view source.
- [x] Confirmed live authenticated Odoo desktop activity dialog.
- [x] Confirmed live authenticated Odoo mobile activity sheet.
- [x] Kept page YAML and API YAML separate and joined by `event-detail`.
- [x] Added durable migration 036 and deterministic seed activity.
- [x] Loaded planned activities through a permissioned scoped datasource.
- [x] Scheduled activity with type, summary, due date, and assignee.
- [x] Completed a planned activity and retained its audit-style message.
- [x] Covered actor, invalid type, cancelled event, and stale row guards.
- [x] Covered file-backed restart/replay persistence.
- [x] Ran authenticated Core3 desktop schedule and completion flow.
- [x] Ran authenticated Core3 mobile DOM/layout check at 390px.
- [ ] Core3 mobile screenshot parity: not claimed because bsk capture output was desktop-sized.
- [ ] Full Events module sign-off: broader actor matrix and route-level visual coverage remain open.
