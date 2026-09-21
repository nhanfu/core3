# Verification

Core3 authenticated bsk pass:

- Browser instance: `245ea108`.
- Runtime: `http://127.0.0.1:4000`, signed in through the existing prefilled
  local demo login without reading or printing credentials.
- Route: `/manufacturing/work-centers/waiting-availability?workcenter_id=workcenter-assembly-2&workcenter=Assembly%202`.
- Desktop capture: `/tmp/core3-manufacturing-work-center-waiting-1440x900.png`,
  1440x719 browser viewport; populated Assembly 2 row, visible List/Calendar/
  Pivot/Graph tabs; SHA-256
  `0abd9e74f92b5e846f09ea2d9f56e52f8dc71b4707a9db70c6e2b322c5eeb4cb`.
- Mobile capture: `/tmp/core3-manufacturing-work-center-waiting-390x844.png`,
  390x844; populated row and no horizontal overflow observed; SHA-256
  `1fb068cd45dfa1513df98d1c9b38fccd19a71ef26823727f5e62106774daddc6`.

The first authenticated Core3 pass rendered without page/request errors. A
later fresh navigation hit an unrelated concurrent Inventory schema failure:

```text
PageSchemaError: Invalid page definition:
- components[0].views[5].category_field is required for graph
- components[0].views[6].title_field is required for activity
- components[0].views[6].activity_types must be a non-empty array for activity
```

No Inventory file was changed by this owner.

Odoo blocker:

- `http://localhost:8069/odoo/work-centers` and
  `http://localhost:8069/web?db=core3_reference` rendered Discuss/OdooBot.
- The launcher exposed no Manufacturing menu, so the authenticated Odoo
  action, desktop/mobile source states, and paired visual comparison were not
  available.
- Blocker captures: `/tmp/odoo-manufacturing-work-center-waiting-blocker-desktop.png`
  (1440x719, SHA-256
  `b8655837d827f6ce56f79d451717c66d2d57ba9448672601f6f6511a5b48d3c3`) and
  `/tmp/odoo-manufacturing-work-center-waiting-blocker-mobile.png`
  (390x844, SHA-256
  `ab25e5d9a4e002449a4af6abffb67f168963841dac8a6acf15b09c542f314ef0`). The
  committed evidence-folder copies are `odoo-desktop-blocker.png` and
  `odoo-mobile-blocker.png`.

No visual parity sign-off is claimed.
