# EVENTS-ATTENDEE-REOPEN-001

Bounded feature: reopen a cancelled event registration.

Core3 implements the Odoo `event.registration.action_set_draft` workflow on
the attendee list and attendee detail pages. The transition is durable,
permissioned by `events.write`, and protected by the registration row version.

## Evidence index

- [Source analysis](odoo-analysis.md)
- [Source comparison](source-comparison.md)
- [Functionality checklist](functionality-checklist.md)
- [Test results](test-results.md)
- [Verification](verification.md)
- [Browser check](browser-check.md)

## Boundary

This is one bounded Events action, not module sign-off. The live Odoo visual
comparison is blocked because the shared authenticated tab is borrowed by
another BrowserSkill team session. No visual-parity claim is made.
