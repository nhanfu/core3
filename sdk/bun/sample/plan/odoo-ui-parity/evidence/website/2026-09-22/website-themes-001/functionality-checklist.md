# Functionality checklist

- [x] `website-themes` page and API join by matching `page.id`.
- [x] Theme and Category search, Author/Category grouping, deterministic rows,
  and empty results.
- [x] Current Website installed/available state is read from durable storage.
- [x] `website.manage` is required for Use, Update, and Remove actions.
- [x] Unavailable theme, duplicate selection, not-selected removal/update, and
  stale Website row-version guards are explicit.
- [x] Theme selection, removal, and refresh survive close/reopen and migration
  replay.
- [x] Odoo desktop/mobile diagnostic evidence is captured and the missing
  Website actor is recorded.
- [ ] Odoo Theme preview/form iframe and actual theme asset side effects.
- [ ] Core3 authenticated desktop/mobile Theme Manager captures; desktop was a
  blank shell and the session closed before mobile capture.
