# QA inventory

Claims checked: source-backed authenticated test launch, durable deterministic
state, idempotent replay, permission/token/actor boundary, restart recovery,
and responsive desktop/mobile rendering.

Exploratory cases: archived survey, missing question graph, missing test-entry
row, and a changed launch key. Each failed atomically without adding a row.

Visual states: authenticated Core3 test page before launch and public test-entry
landing after launch at 1440x900 and 390x844; the same two states were checked
on authenticated Odoo at both viewports.
