# Functionality checklist

- [x] Stable source action identity is recorded: `mass_mailing.action_view_utm_campaigns`.
- [x] Page YAML and API YAML are separate and joined by `page.id`.
- [x] Kanban and list views are exposed in Odoo order and responsive shared primitives.
- [x] Campaign-manager permission is enforced for reads and mutations.
- [x] Deterministic migration is idempotent and uses fixed timestamps.
- [x] Search, stage filter, active/archived filter, empty state, and not-found detail query are declared.
- [x] Create and edit validate non-blank names and valid stages, with duplicate and stale guards.
- [x] Archive and restore persist row versions and active state.
- [x] Mailing stat navigation filters the existing mailing action by campaign name.
- [ ] Installed authenticated Odoo desktop/mobile visual comparison: blocked by BrowserSkill tab ownership.
- [ ] Full Campaigns parity: A/B testing, chatter, activities, tag many2many widget, and campaign-scoped mailing creation remain separate slices.
