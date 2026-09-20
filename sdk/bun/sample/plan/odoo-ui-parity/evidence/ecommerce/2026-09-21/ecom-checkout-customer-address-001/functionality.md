# Functionality evidence

- Fixtures: Acme has deterministic active delivery and billing addresses;
  migration replay does not duplicate them.
- Read boundary: checkout address options require an open cart and filter by
  customer, company, active state, and authenticated customer scope.
- CRUD: authenticated Ecommerce writers can create, edit, and archive an
  address; type, required-field, duplicate-label, ownership, company, and
  optimistic row-version guards reject invalid or stale mutations.
- Checkout: selecting an active saved address replaces the fallback free-text
  value in the confirmed order's durable `shipping_address` snapshot.
- Restart: address records and fields survive DuckDB close/reopen and replay.

No module sign-off is claimed. Billing-partner semantics, country/state
reference data, external delivery recalculation, browser actor coverage, and
paired Odoo rendering remain open.
