# Source comparison

| Odoo 19 contract | Core3 bounded implementation | Result |
| --- | --- | --- |
| `accountant_confirm_entries_action` is a list/kanban Review Entries server action | `review_journal_entry` is exposed from the Journal Entries row menu and detail header | bounded implementation |
| `check_selected_moves()` calls `set_moves_checked()` | YAML mutation sets `accounting_journal_entries.checked = TRUE` | implemented |
| Only posted moves can be marked reviewed | State guard requires `Posted`; Draft rows remain unchanged | implemented |
| Accounting User is required | Core3 mutation requires `accounting.write` | mapped permission boundary |
| Reviewed state survives later reads | Migration `20260922200000-054-accounting-journal-entry-reviewed.yaml` adds durable state and the datasource exposes it | implemented |
| Odoo list/kanban bulk selection | Core3 provides one-row action with the same server-side transition | explicit bounded difference |
| Live responsive Odoo comparison | BrowserSkill could not acquire the shared authenticated tab | blocked; no visual claim |
