# QA inventory

| Check | Result |
| --- | --- |
| Odoo source route/action comparison | covered |
| Page/API `page.id` separation | covered |
| Public token ownership | covered |
| Feedback validation and upsert | covered |
| Leave workflow and replay guard | covered |
| Migration replay and restart | covered |
| Odoo desktop/mobile visitor UI | blocked: Live Chat is not installed in `core3_reference` |
| Core3 authenticated desktop/mobile visitor UI | blocked: shared Vite proxy reports `EMFILE`; standalone backend replayed `coredb/accounting.duckdb.wal` and failed with DuckDB missing-default-database internal error |

Odoo blocker captures are outside Git at `/tmp/odoo-livechat-visitor-feedback-apps-desktop-20260921.png`,
`/tmp/odoo-livechat-visitor-feedback-apps-mobile-20260921.png`,
`/tmp/odoo-livechat-visitor-feedback-404-desktop-20260921.png`, and
`/tmp/odoo-livechat-visitor-feedback-404-mobile-20260921.png`.

SHA-256: desktop Apps `430a164d65da8178dbfa8454d609781a678c85860211db2137cc632ae2b860b5`,
mobile Apps `a20067d6cdfb88e39c6a88002a806a8d7f2bce7ab79d52aea3cf32eb1eb6b469`,
desktop 404 `9e67f0679a0d893573aafc671784a0414a8f6e99080a4928b8edc3535a68e3ad`,
mobile 404 `f16df7a8d73aca8a659cb28c05b6304829f690f8af46a3a588f204d19aa07ff8`.
