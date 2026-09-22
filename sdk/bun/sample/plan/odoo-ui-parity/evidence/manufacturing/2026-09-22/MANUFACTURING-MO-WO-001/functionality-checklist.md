# Functionality checklist

- [x] Source action, model, domain, and modes inspected.
- [x] MO detail launcher navigates with the selected durable MO ID.
- [x] Selected MO rows are isolated from other manufacturing orders.
- [x] State, search, and late filters are declared and queried.
- [x] Finished and active work-order states remain available under the source domain.
- [x] Empty, missing-MO, and transport-error states are covered.
- [x] Read and write permissions are explicit.
- [x] Guarded work-order workflow actions are reused.
- [x] Create/delete are absent.
- [x] Migration replay and file-backed restart are covered.
- [ ] Authenticated Odoo desktop/mobile action capture — blocked by borrowed tab.
