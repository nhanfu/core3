# Functionality checklist

| Case | Check | Result |
| --- | --- | --- |
| INV-STOCK-AT-DATE-001-FUNC-01 | Odoo menu/action and page/API `page.id` contracts | PASS |
| INV-STOCK-AT-DATE-001-FUNC-02 | Deterministic date context is seeded and migration is idempotent | PASS |
| INV-STOCK-AT-DATE-001-FUNC-03 | Select 2026-01-14 filters the report empty; select 2026-01-16 restores 10 rows | PASS |
| INV-STOCK-AT-DATE-001-FUNC-04 | Invalid dates return 422 without a partial report run | PASS |
| INV-STOCK-AT-DATE-001-FUNC-05 | Wrong company context returns 403; unauthorized page access returns 403 | PASS |
| INV-STOCK-AT-DATE-001-FUNC-06 | Selected context and report rows survive close/reopen | PASS |
| INV-STOCK-AT-DATE-001-UI-01 | Authenticated Core3 desktop wizard/context/reload at 1440x900 | PASS |
| INV-STOCK-AT-DATE-001-UI-02 | Authenticated Core3 mobile wizard/context/reload at 390x844 | PASS |
| INV-STOCK-AT-DATE-001-UI-03 | Authenticated Odoo desktop/mobile comparison | Desktop wizard PASS; mobile control not exposed in responsive action surface |
