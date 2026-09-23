# Functionality checklist

- [x] Stable feature ID recorded: `FLEET-CONTRACT-STATUSBAR-001`.
- [x] Odoo source view/model inspected at the pinned revision.
- [x] Page YAML remains presentation-only and binds through `page.id`.
- [x] New, Running, Expired, and Closed statusbar stages map to real YAML mutations.
- [x] Transitions persist and increment `row_version`.
- [x] Closed-contract reopening is rejected with the existing 409 guard.
- [x] Existing contract and vehicle statusbar regressions pass.
- [ ] Authenticated Odoo Fleet visual comparison — blocked because no borrowable Odoo Fleet tab was available.
- [ ] Authenticated Core3 desktop/mobile visual comparison — not claimed in this slice.
