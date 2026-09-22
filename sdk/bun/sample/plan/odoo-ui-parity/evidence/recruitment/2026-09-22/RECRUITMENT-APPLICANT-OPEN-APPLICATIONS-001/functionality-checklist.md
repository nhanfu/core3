# Functionality checklist

- [x] Odoo model action and applicant-form stat binding traced.
- [x] Separate YAML page and API contracts use matching `page.id`.
- [x] Applicant detail stat action is read-only and permissioned with `recruitment.read`.
- [x] Related applications match deterministic email/phone/pool-link rules.
- [x] Archived applications remain visible and expose workflow status.
- [x] Company scope, search, empty, missing, unauthorized, forbidden, and transport contracts are declared.
- [x] Migration 026 is deterministic and idempotent.
- [x] File-backed restart preserves the related application rows.
- [x] Existing Recruitment workflow and opening counts remain green after the fixture was isolated from opening 001.
- [ ] Authenticated Odoo desktop/mobile visual comparison — blocked by BrowserSkill tab-borrow confirmation timeout.
