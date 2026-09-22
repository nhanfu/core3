# Functionality checklist

- [x] Durable favorite relation migration is idempotent and indexed by post and
      user.
- [x] Detail datasource returns per-user `is_favorite` and aggregate
      `favourite_count` for the authenticated actor.
- [x] Presentation/API fragments remain separate and join by
      `page.id: forum-question-detail`.
- [x] Favorite and Remove favorite controls are permission-filtered and visible
      from the question detail header.
- [x] Toggle inserts or deletes only the current actor's relation and returns
      the new state/count atomically.
- [x] Active/closed questions can toggle; archived questions, missing actors,
      stale versions, and denied HTTP actors are rejected without writes.
- [x] Per-user state, aggregate count, and row versions survive file-backed
      restart and migration replay.
- [ ] Authenticated Odoo/Core3 desktop and mobile visual comparison; blocked by
      the borrowed tab and missing `website_forum` reference addon.
