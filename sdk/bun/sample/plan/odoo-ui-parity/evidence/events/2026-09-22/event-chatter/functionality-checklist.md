# Functionality checklist

- [x] Compared local Odoo model and form view source.
- [x] Confirmed authenticated Odoo desktop and mobile chatter composers.
- [x] Kept page YAML and API YAML separate and joined by `event-detail`.
- [x] Added durable migration 037 and deterministic Event created seed.
- [x] Unified messages, notes, and existing activities in a scoped datasource.
- [x] Sent a message and logged an internal note with durable persistence.
- [x] Enforced `events.write`, actor, content, cancelled-event, and row-version guards.
- [x] Covered atomic parent version advancement and no-partial-write failures.
- [x] Covered file-backed restart/replay persistence.
- [x] Captured authenticated Odoo desktop/mobile evidence.
- [ ] Core3 authenticated desktop/mobile screenshots: not claimed after requested bsk session closure.
- [ ] Full Events module sign-off: broader actor matrix and route-level visual coverage remain open.
