# Functionality checklist

| Capability | Result | Evidence |
| --- | --- | --- |
| Odoo source/action mapping | pass | `odoo-analysis.md` and Odoo captures |
| YAML page/API separation | pass | focused feature test |
| Eligible template options | pass | focused feature test and deterministic fixture |
| Employee and current-version copy | pass | focused mutation assertions |
| Company, active, stale, and template guards | pass | focused guard test |
| Migration replay and file restart | pass | focused restart test |
| Authenticated Core3 desktop/mobile action | blocked | `core3-blocker.json`, company fixture mismatch |
| Authenticated Odoo desktop/mobile comparison | pass | Payroll and modal captures |
