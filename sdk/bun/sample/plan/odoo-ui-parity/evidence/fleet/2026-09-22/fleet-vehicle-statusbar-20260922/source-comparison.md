# Source comparison

| Odoo contract | Core3 implementation | Result |
| --- | --- | --- |
| Clickable `state_id` statusbar | `pages/vehicle-detail.yaml` `statusbar_actions` | Supported |
| Direct vehicle state persistence | Four `yaml_mutation` actions in `api/vehicle-detail.yaml` | Supported |
| Fleet officer write permission | `fleet.write` on each status action | Supported |
| Vehicle/company scope and stale safety | 403 company and 409 row-version guards | Supported |
| Dynamic custom Odoo status catalog | Existing bounded Core3 four-state catalog | Deferred; not expanded in this slice |
| Native Odoo visual comparison | Browser tab borrow timed out | Blocked; no visual claim |
