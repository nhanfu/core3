# Functionality checklist

- [x] Stable Cards row action is labeled `Color` and requires `surveys.write`.
- [x] Page/API fragments join through `page.id: surveys`.
- [x] Odoo palette indexes 0..11 are accepted and persisted.
- [x] Missing actor, missing survey, archived survey, stale row, and invalid
  color requests are rejected before mutation.
- [x] Color and row version survive a file-backed DuckDB reopen.
- [ ] Authenticated Odoo desktop/mobile visual comparison: blocked by tab
  ownership; no sign-off claimed.
