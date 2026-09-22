# Live Chat authenticated transcript email

Feature ID: `livechat-transcript-email-001`

This bounded slice adds the authenticated operator action for emailing a
closed Live Chat transcript. It retains Odoo's
`/im_livechat/email_livechat_transcript` route string, validates the recipient
and operator/session state, and persists a `Queued` delivery request. Core3's
Live Chat service has no outbound mail transport configured, so this evidence
does not claim external email delivery.

| Artifact | Purpose |
| --- | --- |
| `odoo-analysis.md` | Odoo controller/model/UI source trace |
| `functionality-checklist.md` | Stable acceptance cases |
| `source-comparison.md` | Before/after classification |
| `gap-matrix.md` | Bounded Odoo/Core3 mapping |
| `test-results.md` | Focused validation results |
| `verification.md` | Browser evidence and blocker |
