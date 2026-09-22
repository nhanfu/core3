# Functionality checklist

- [x] Layout-only page and API fragment remain separate and share `page.id`.
- [x] Invoice group contract is declared in the page, pivot metadata, and API.
- [x] Fixed invoice fixtures provide repeated invoices and a no-invoice group.
- [x] Current-user and current-company scope remain enforced.
- [x] Empty fixture remains empty.
- [x] A persisted invoice relation update is visible on the next read.
- [x] Migration replay and file-backed restart preserve invoice values.
- [ ] Authenticated desktop/mobile visual parity; blocked and not claimed.
- [ ] Invoice record navigation/stat action; outside this bounded stable-ID slice.
