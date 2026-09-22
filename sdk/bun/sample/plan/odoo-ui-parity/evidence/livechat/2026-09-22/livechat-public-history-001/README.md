# Live Chat public history command — bounded evidence

Stable feature ID: `livechat-public-history-001`.

This slice adds the operator-triggered Odoo Live Chat page-history command to
the existing authenticated session detail. It retains Odoo's regular and CORS
route strings, checks the selected visitor partner against the session, and
renders the Odoo `No history found` state.

| Artifact | Purpose |
| --- | --- |
| `odoo-analysis.md` | Local Odoo controller, partner model, CORS, and frontend trace |
| `source-comparison.md` | Odoo/Core3 contract mapping and bounded differences |
| `gap-matrix.md` | Remaining gaps and follow-up evidence |
| `functionality-checklist.md` | Stable acceptance cases |
| `test-results.md` | Focused test and static validation results |
| `verification.md` | Single BrowserSkill attempt and blocker |

No browser screenshot or visual-parity claim is made for this slice.
