# Functionality checklist

- [x] Add a visible Orders stat action to the POS session detail contract.
- [x] Keep page YAML and API YAML separate with matching `page.id` values.
- [x] Filter by selected `session_id` and current company in the service query.
- [x] Require `pos.read` on the page, datasource, and navigation actions.
- [x] Support bounded search by order/customer and status filtering.
- [x] Navigate rows to the existing POS order detail route.
- [x] Declare empty, not-found, unauthorized, forbidden, and transport states.
- [x] Verify migration replay and file-backed restart durability using existing
  durable order/session rows.
- [ ] Compare authenticated Odoo/Core3 desktop at 1440x900.
- [ ] Compare authenticated Odoo/Core3 mobile at 390x844.

The two visual cases remain open because the required BrowserSkill tab borrow
timed out; they are not marked pass.
