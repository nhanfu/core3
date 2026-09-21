# Verification

Odoo reference blocker:

- Desktop capture: `odoo-desktop-blocker.png`, 1916x833. The authenticated
  route resolved to Discuss/OdooBot and exposed no Manufacturing launcher.
- Mobile capture: `odoo-mobile-blocker.png`, 390x844. The same authenticated
  session exposed no Manufacturing surface.

No Odoo visual parity claim is made. Core3 authenticated browser verification
passed on `http://127.0.0.1:4010` as Admin User:

- Desktop list at exact 1440x900:
  `/tmp/core3-manufacturing-work-center-late-desktop-1440x900.png`
  (SHA-256 `9078208e547ac4af371d2c7a7a1a50a6e6ba49f22584c647bc459a88cd9b2b3c`).
- Mobile list at exact 390x844:
  `/tmp/core3-manufacturing-work-center-late-mobile-390x844.png`
  (SHA-256 `f9ecb89cce19b2c6fc1126d76ca4de6fa66941db5d681130ade03c472313458b`).
- Desktop Graph mode:
  `/tmp/core3-manufacturing-work-center-late-graph-1440x900.png`
  (SHA-256 `942264932728a20254e38daa15096fa980710f3507104a5edd3250bae6ec9f7c`).

The route rendered the selected Assembly 2 group and its durable late Waiting
row, exposed List/Calendar/Pivot/Graph tabs, opened the reused Work Order detail
through the actual row link, and showed Plan/Cancel controls. Relevant Core3
route, page, asset, datasource, and query requests returned 200; no route-level
render failure or horizontal overflow was observed. The shared browser profile
also contained unrelated extension errors from previously open Odoo tabs; those
are not attributed to this Core3 route.
