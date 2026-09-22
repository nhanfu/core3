# Functionality checklist

- [x] Stable feature ID EVENTS-TAGS-001 and source action recorded.
- [x] Page YAML owns the detail layout; API YAML owns child datasource/actions.
- [x] page.id discovery binds event_tag_category_tags to the detail page.
- [x] Migration 039 creates/replays the durable child table and fixed seeds.
- [x] Read path covers populated and explicit empty states.
- [x] Add validates parent version, required name, color range, and duplicate.
- [x] Edit validates parent/line versions and projects category summary.
- [x] Delete validates parent/line versions and projects category summary.
- [x] Focused tests cover missing/duplicate/invalid/stale/restart behavior.
- [ ] Authenticated Odoo desktop capture.
- [ ] Authenticated Odoo mobile capture.
- [ ] Paired authenticated Core3 desktop/mobile visual comparison.

The last three items are intentionally open because the required signed-in tab
was already borrowed by another BrowserSkill session. No visual parity claim is
made.
