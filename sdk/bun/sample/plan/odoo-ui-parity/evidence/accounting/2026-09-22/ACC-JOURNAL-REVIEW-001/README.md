# ACC-JOURNAL-REVIEW-001 — Journal Entries Reviewed action

Bounded source-backed Accounting action slice for Odoo 19
`accountant_confirm_entries_action` / `account.move.check_selected_moves`.

| Artifact | Purpose |
| --- | --- |
| [odoo-analysis.md](odoo-analysis.md) | Local source comparison and live-reference boundary |
| [source-comparison.md](source-comparison.md) | Odoo/Core3 action mapping |
| [functionality-checklist.md](functionality-checklist.md) | Stable-ID acceptance cases |
| [gap-matrix.md](gap-matrix.md) | Implemented scope and explicit limits |
| [test-results.md](test-results.md) | Focused test and static-gate results |
| [browser-check.md](browser-check.md) | BrowserSkill ownership result and no-claim boundary |

Core3 adds a durable reviewed flag and guarded `Reviewed` actions to the
page/API-separated Journal Entries list and detail contracts. This is one
bounded action slice, not Accounting module completion.

No credentials, cookies, tokens, or screenshots are stored here.
