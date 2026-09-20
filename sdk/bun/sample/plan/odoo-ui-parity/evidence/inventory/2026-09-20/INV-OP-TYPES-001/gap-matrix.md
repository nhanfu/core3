# Gap matrix

| Source behavior | Core3 status | Evidence / residual |
| --- | --- | --- |
| Configuration menu and `list,form` action | complete | Core3 list/detail captures; Odoo action runtime-blocked |
| Active/archive list filtering | complete | deterministic migration and datasource test |
| Create operation type with required kind/locations | complete | create action binding, modal, CRUD test |
| Edit source/destination and settings | complete | detail API/page and edit/reload capture |
| Archive blocked by open transfers | complete | focused guard test |
| Row-version durability across restart | complete | migration `0.0.24` and restart test |
| Odoo visual/mutation comparison | blocked | authenticated `/odoo/action-426` generic `Oops!` at both viewports |
| Odoo lot/package/print group-gated detail behavior | open | requires a healthy source action and suitable reference groups |
