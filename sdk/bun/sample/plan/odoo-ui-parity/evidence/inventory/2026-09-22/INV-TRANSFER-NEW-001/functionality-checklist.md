# Functionality checklist

- [x] Page and API YAML are separate and joined by `page.id: transfer-new`.
- [x] Overview New action is permissioned by `inventory.write`.
- [x] Operation type and location options are read-scoped and company-aware.
- [x] New Transfer form defaults operation type, locations, company, date, and
  Draft state.
- [x] Create requires a signed-in actor and write permission.
- [x] Guards reject wrong company/type, missing reference/date, same locations,
  duplicate reference, and invalid scope.
- [x] Draft transfer, creation-run audit, and message are durable.
- [x] Restart reads retain the creation history.
- [ ] Product-line Add a Product workflow.
- [ ] Note persistence and full chatter behavior.
- [ ] Mark as Todo, Check Availability, Validate, Return, and Cancel.
- [ ] Live Odoo form/mutation comparison.
- [ ] Authenticated Core3 desktop/mobile capture; runtime is blocked before
  route serving.
