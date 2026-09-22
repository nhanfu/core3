# Functionality checklist

- [x] Stable feature ID is distinct from existing request CRUD, workflow, and
  equipment/category stat actions.
- [x] Empty request timeline remains safe when no activities/messages exist.
- [x] Deterministic initial “Maintenance Request created” timeline rows are
  seeded idempotently.
- [x] Valid note persists with actor, stable message ID, action label, content,
  and parent row-version increment.
- [x] Blank content returns `422 MAINTENANCE_NOTE_CONTENT_INVALID`.
- [x] Missing request returns `404 MAINTENANCE_REQUEST_NOT_FOUND`.
- [x] Archived or stale request returns `409 MAINTENANCE_NOTE_PARENT_CHANGED`.
- [x] Missing actor returns `403 MAINTENANCE_NOTE_ACTOR_REQUIRED`.
- [x] Migration replay and file-backed restart retain seeded and posted notes.
- [x] Existing scheduled/completed activity behavior remains covered by its
  focused regression test.
