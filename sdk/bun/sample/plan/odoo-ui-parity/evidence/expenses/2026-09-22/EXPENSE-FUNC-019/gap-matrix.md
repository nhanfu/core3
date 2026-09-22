# EXPENSE-FUNC-019 gap matrix

| ID | Acceptance | Evidence |
| --- | --- | --- |
| `EXPENSE-FUNC-019-SOURCE` | Odoo same-receipt compute and action are mapped | Source comparison and focused test |
| `EXPENSE-FUNC-019-NAVIGATION` | Detail action opens the page-ID-bound matching list and rows open detail | YAML contract test |
| `EXPENSE-FUNC-019-SCOPE` | Same-checksum rows exclude the origin and stay in current-company scope | Focused query test |
| `EXPENSE-FUNC-019-EMPTY` | Missing checksum, no match, search, and transport error are deterministic | Focused query test |
| `EXPENSE-FUNC-019-PERSISTENCE` | Fixture survives migration replay and detail count is projected | Migration/detail tests |
| `EXPENSE-FUNC-019-VISUAL` | Authenticated Odoo/Core3 desktop/mobile comparison | Blocked by incomplete BrowserSkill tab borrow; no visual claim |

Remaining scope is Odoo's full attachment binary/checksum storage behavior and
the broader Expenses visual/module sign-off.
