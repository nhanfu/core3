# EVENTS-TEMPLATE-QUESTIONS-001

This evidence folder records the bounded Event Template Questions relation
slice. It does not sign off the Events module.

Implementation:

- Page: `services/events/pages/event-template-detail.yaml`
- API: `services/events/api/event-template-detail.yaml`
- Migration: `services/events/migrations/20260922220000-040-event-template-questions.yaml`
- Focused test: `test/events_template_questions.integration.test.ts`

The slice implements the Odoo Event Template Questions notebook relation with
durable reusable-question links, stable seed data, Add a line and Remove,
permission checks, duplicate/invalid/stale guards, empty/transport contracts,
and restart/migration replay coverage.

Automated evidence:

- Focused: 2 tests / 24 assertions
- Related template regression: 9 tests / 93 assertions

Live Odoo desktop/mobile evidence is blocked by the authenticated-tab borrow
timeout documented in `browser-check.md`. No visual-parity claim is made.
