# QA inventory

| Case | Class | Expected evidence |
| --- | --- | --- |
| Odoo model, builder, template, and stylesheet trace | functional | focused test source assertions |
| Matching page/API IDs and manifest route | integration | focused test contract assertions |
| Read policy with visible default | data | focused integration test |
| Missing fixture read | data | focused integration test |
| Invalid boolean update | permission/workflow | focused integration test |
| Foreign-company update | permission/security | focused integration test |
| Stale row-version update | workflow/concurrency | focused integration test |
| Shop policy and product projection | functional | focused integration test |
| Migration replay and restart persistence | data/regression | focused integration test |
| Authenticated Odoo desktop/mobile reference | visual/responsive | paired 404 captures; visual sign-off blocked |
