# Live Chat public transcript download — bounded evidence

Stable feature ID: `livechat-transcript-download-001`.

This slice adds the token-scoped public PDF transcript download to the existing
visitor-session page. It is distinct from the authenticated transcript-email
queue: the artifact is durable, the visitor token is checked at query time, and
the download is available only for a closed session with an artifact.

| Artifact | Purpose |
| --- | --- |
| `odoo-analysis.md` | Odoo controller/widget/report source trace |
| `source-comparison.md` | Odoo/Core3 contract mapping |
| `gap-matrix.md` | Bounded missing-feature mapping |
| `functionality-checklist.md` | Stable acceptance cases |
| `test-results.md` | Focused and paired test results |
| `verification.md` | BrowserSkill ownership blocker and visual-evidence status |

No screenshots are claimed for this slice. The shared authenticated Odoo tab
could not be borrowed because extension confirmation timed out; no independent
browser or login was used.
