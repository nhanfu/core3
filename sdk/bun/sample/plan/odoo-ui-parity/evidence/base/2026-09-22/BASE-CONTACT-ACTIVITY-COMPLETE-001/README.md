# BASE-CONTACT-ACTIVITY-COMPLETE-001

Bounded Base/Contacts parity slice for completing and cancelling contact activities.

## Result

- Odoo source-backed actions: `action_done` and `action_cancel`.
- Core3 actions: `complete_contact_activity` and `cancel_contact_activity`.
- Durable state: `base_activities.state`, `completed_at`, and `row_version`.
- Audit: completion/cancellation entries in `base_contact_messages`.
- Focused test: 3 tests, 25 assertions passed.
- Visual parity: not claimed; the authenticated Odoo tab could not be borrowed.

See [source-comparison.md](source-comparison.md), [verification.md](verification.md), and [browser-check.md](browser-check.md).
