# Verification

The focused integration suite verifies:

- discovered list/detail routes and page/API ownership;
- automatic default ordering, archived filtering, manual filtering, empty
  results, and company isolation;
- create persistence and derived product metadata;
- duplicate product/location, invalid min/max, invalid company, and stale
  row-version rejection;
- edit, archive, restore, delete, and file-backed migration replay.

The feature uses inventory.read for reads and inventory.manage for mutations.
The Core3 browser visual gate is not passed: the required authenticated Odoo
tab could not be borrowed. No Odoo desktop/mobile screenshots, live mutation
evidence, or visual-parity claim is made.
