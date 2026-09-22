# Functionality checklist

- [x] Add the Odoo-shaped Pickings stat action to POS session detail.
- [x] Keep page YAML and API YAML separate with matching `page.id` values.
- [x] Project only Ready pickings belonging to the selected session and
  current company.
- [x] Require `pos.read` on the page, datasource, stat action, and row action.
- [x] Support bounded search, status filtering, list/card responsive views,
  and row navigation to Inventory transfer detail.
- [x] Declare unauthorized, forbidden, missing-session, transport, and empty
  states.
- [x] Verify migration replay and file-backed restart durability using the
  existing durable POS picking projection.
- [ ] Compare authenticated Odoo/Core3 desktop at 1440x900.
- [ ] Compare authenticated Odoo/Core3 mobile at 390x844.

The two visual cases remain open because the required BrowserSkill tab was
owned by another session; they are not marked pass.
