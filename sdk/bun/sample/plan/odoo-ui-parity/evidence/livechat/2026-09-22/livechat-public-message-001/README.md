# Live Chat public visitor message composer

Feature ID: `livechat-public-message-001`

This bounded slice adds the public visitor message composer to the existing
token-scoped `/livechat/visitor-session` page. It is deliberately separate
from widget bootstrap/resume and visitor feedback/leave: it persists a new
visitor timeline message through the existing `livechat_session_messages`
table and refreshes the visitor transcript.

| Artifact | Purpose |
| --- | --- |
| `odoo-analysis.md` | Odoo 19 controller and public widget source trace |
| `functionality-checklist.md` | Stable acceptance cases for this slice |
| `source-comparison.md` | Odoo/reference/Core3 classification |
| `gap-matrix.md` | Bounded implementation mapping |
| `test-results.md` | Focused and regression command results |
| `verification.md` | Browser/reference evidence and blockers |

The authenticated reference blocker is evidenced outside Git by
`/tmp/odoo-livechat-public-message-blocker-desktop-20260922.png` and
`/tmp/odoo-livechat-public-message-blocker-mobile-20260922.png`. The local
Core3 browser result is recorded in `verification.md`; no visual parity claim
is made when the runtime is unavailable.
