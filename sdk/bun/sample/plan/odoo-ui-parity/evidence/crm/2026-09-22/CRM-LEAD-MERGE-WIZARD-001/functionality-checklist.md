# Functionality checklist

- [x] Stable source action and model traced to local Odoo 19 source.
- [x] Core3 existing merge implementation inspected before editing.
- [x] Separate page/API ownership retained through `page.id: leads`.
- [x] Modal fields for salesperson and sales team declared with existing lookup sources.
- [x] Selected IDs remain explicit bulk transport values.
- [x] At least two open records required.
- [x] Won/lost records cannot be merged and remain unchanged when mixed into selection.
- [x] Survivor selection is deterministic by `created_at`, then ID.
- [x] Lead/opportunity values and planned activities reparent to the survivor.
- [x] Explicit assignment persists on the survivor.
- [x] One-record and closed-only error guards are tested.
- [ ] Authenticated Odoo desktop screenshot and interaction trace.
- [ ] Authenticated Odoo mobile screenshot and interaction trace.
- [ ] Paired authenticated Core3 desktop/mobile screenshot.

The final three cases are open because BrowserSkill could not borrow the shared
authenticated Odoo tab in this run.
