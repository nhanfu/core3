# BASE-CONTACT-ACTIVITY-FEEDBACK-001

Bounded Base/Contacts parity slice for completing a contact activity with feedback.

## Result

- Odoo source action: `mail.activity.action_feedback(feedback=..., attachment_ids=...)`.
- Core3 action: `complete_contact_activity_feedback` on the existing `contact-detail` activity list.
- Durable state: `base_activities.feedback`, `state`, `completed_at`, and `row_version`.
- Focused test: 2 tests, 17 assertions passed.
- Visual parity: not claimed because the authenticated localhost tab could not be borrowed.

See [source-comparison.md](source-comparison.md), [verification.md](verification.md), and [browser-check.md](browser-check.md).
