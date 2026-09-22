# FORUM-QUESTION-FAVORITE-001

Bounded feature: authenticated Forum question favorite/unfavorite action.
This slice does not sign off the Forum module or claim paired visual parity.

| Artifact | Result |
| --- | --- |
| `odoo-analysis.md` | Odoo controller/model/source comparison and live blocker |
| `source-comparison.md` | Stable-ID gap mapping |
| `functionality-checklist.md` | Feature acceptance cases |
| `test-results.md` | Focused test and diff evidence |
| `verification.md` | BrowserSkill attempt, captures, and exact blockers |

Odoo/Core3 desktop/mobile visual pairing is blocked: the shared authenticated
tab was already borrowed by another BrowserSkill session, and the reference
database does not have `website_forum` installed.
