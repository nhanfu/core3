# Functionality checklist

- [x] Page/API contracts both use `event-detail`.
- [x] Seed one deterministic follower and two candidate users.
- [x] Read follower list and candidate options with `events.read`.
- [x] Add follower with `events.write`; increment event version and write chatter audit.
- [x] Remove follower with `events.write`; increment event version and write chatter audit.
- [x] Reject anonymous, missing-user, duplicate, cancelled, stale, and missing-follower writes.
- [x] Replay migration and reopen file-backed database without duplicate seed rows.
- [x] Capture authenticated Odoo follower controls at desktop and mobile sizes.
- [ ] Capture paired authenticated Core3 desktop/mobile views before visual sign-off.
