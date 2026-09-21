# Gap matrix

| Gap before slice | Required change | Result |
| --- | --- | --- |
| Detail displayed access fields but had no mutation | Add API-owned `update_survey_access` and page-owned action | complete |
| Attempts had public enforcement but no authenticated configuration guard | Add positive, identity, permission, archive, and stale guards | complete |
| Roaming conflict was only guarded by scoring mutation | Mirror Odoo constraint on access update | complete |
| Core3 visual verification unavailable | Record exact pre-ready discovery error; do not claim parity | blocker recorded |
