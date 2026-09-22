# EXPENSE-FUNC-018 gap matrix

| ID | Acceptance | Evidence |
| --- | --- | --- |
| `EXPENSE-FUNC-018-SOURCE` | Odoo attachment create/delete state boundary is represented | Source comparison and focused test |
| `EXPENSE-FUNC-018-UPLOAD` | Draft and submitted receipt upload paths remain available | Focused mutation test |
| `EXPENSE-FUNC-018-REMOVE` | Receipt removal clears metadata, increments parent version, and audits the actor | Focused mutation test |
| `EXPENSE-FUNC-018-GUARDS` | Actor, approved-state, stale, and company boundaries reject safely | Focused mutation test and YAML guards |
| `EXPENSE-FUNC-018-PERSISTENCE` | Attachment row version survives migration/replay | Migration and focused contract test |
| `EXPENSE-FUNC-018-VISUAL` | Authenticated Odoo/Core3 desktop/mobile comparison | Blocked by explicit BrowserSkill tab ownership; no visual claim |

Residual scope is full binary preview/storage lifecycle and broader Expenses
visual/module sign-off.
