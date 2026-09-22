# BASE-CONTACT-ACTIVITY-RESCHEDULE-001

Bounded Base/Contacts parity slice for rescheduling contact activities.

## Result

- Odoo source-backed actions: `action_reschedule_today`,
  `action_reschedule_tomorrow`, and `action_reschedule_nextweek`.
- Core3 actions: bulk and row Today, Tomorrow, and Next Week actions on the
  contact activity list.
- Durable state: `base_activities.due_date` and `row_version`.
- Focused test: 3 tests, 29 assertions passed.
- Visual parity: not claimed; the authenticated Odoo tab could not be borrowed.

See [source-comparison.md](source-comparison.md), [verification.md](verification.md),
and [browser-check.md](browser-check.md).
