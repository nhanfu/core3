# Functionality checklist

| Lifecycle | Result |
| --- | --- |
| Read Physical Inventory list | PASS: authenticated Core3 and Odoo captures |
| Open Apply All form | PASS: reason/date fields visible in Core3 desktop capture |
| Reject invalid reason/date | PASS: focused integration test |
| Reject empty counted set | PASS: focused integration test |
| Apply only counted quantities | PASS: counted-only mutation assertion |
| Persist adjustment audit run | PASS: deterministic ID and restart assertion |
| Record non-zero move history | PASS: `inventory_move_lines` assertion |
| Enforce read/write boundary | PASS: read-only Apply All rejected with 403 |
| Responsive authenticated route | PASS: direct Core3 mobile route, no request errors or overflow |
| Paired Odoo comparison | PASS: authenticated desktop/mobile captures; no Odoo mutation |

Residual: conflict/reset/relocation/request-count/history presentation and the
full Inventory actor matrix remain in the module gap ledger.
