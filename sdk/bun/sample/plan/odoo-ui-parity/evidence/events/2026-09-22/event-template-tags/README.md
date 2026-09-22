# EVENTS-TEMPLATE-TAGS-001

This evidence folder records the bounded implementation of Odoo's reusable
`event.type.tag_ids` relation on the Event Template form.

The Core3 implementation keeps the existing `event-template-detail` page/API
pair, adds durable `event_template_tags` links, stable Exhibition fixtures,
scoped options, and permissioned add/remove actions with parent and line
row-version guards.

The focused integration test covers source mapping, migration replay, empty
state, option filtering, persistence after restart, duplicate/invalid-tag
validation, and stale parent/line writes.
