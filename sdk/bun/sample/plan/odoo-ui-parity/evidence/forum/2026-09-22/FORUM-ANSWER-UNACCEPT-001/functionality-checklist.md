# Functionality checklist

- [x] Question-detail presentation and backend API are separate YAML fragments
      joined by `page.id: forum-question-detail`.
- [x] Accepted answer exposes a visible `Unaccept` action only while the answer
      state is `Accepted`.
- [x] The mutation requires `forum.manage`, the current parent row version, and
      the current answer row version.
- [x] A valid unaccept changes `Accepted` to `Active`, increments both versions,
      and leaves answer/post relations intact in one mutation transaction.
- [x] Repeated unaccept and stale parent requests return conflict errors without
      changing either row.
- [x] Authenticated action access is denied without `forum.manage`.
- [x] The transition remains durable after a file-backed restart and migration
      replay.
- [ ] Odoo/Core3 desktop and mobile visual comparison; blocked by missing
      `website_forum` in `core3_reference` and the stopped Core3 browser session.
