# Functionality checklist

- [x] Read vehicle tags by company and vehicle.
- [x] Offer only unassigned tags for an active vehicle.
- [x] Add/remove a tag with authenticated Fleet write permission.
- [x] Reject missing actor, wrong company, archived/missing vehicle, invalid tag, duplicate assignment, missing relation, and stale parent version.
- [x] Keep failures atomic and preserve row versions.
- [x] Replay migrations idempotently.
- [x] Persist assignments across file-backed DuckDB restart.
- [ ] Authenticated Odoo/Core3 desktop and mobile visual comparison; blocked by missing live Odoo Fleet and unavailable authenticated Core3 runtime.
