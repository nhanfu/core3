# BASE-CONTACT-DUPLICATE-001

Bounded Base/Contacts slice: duplicate an existing contact from the contact
detail Actions menu, preserving contact fields and category relations while
assigning an Odoo-compatible `(copy)` name and durable new identity.

The page contract is layout-only and binds `duplicate_contact_ui` through
`page.id: contact-detail`; the server mutation and client action are owned by
`api/contact-detail.yaml`. Contract, guard, restart, audit, build, and diff
checks passed. Live Odoo behavior was inspected with authenticated bsk session
`vpqt` before that session stopped.

No screenshot is included: the authenticated Core3 bsk session dropped before
the duplicate transition could be captured, and a fresh session `pwew` stopped
immediately with `session not registered or already stopped`. Therefore this
evidence does not claim desktop/mobile visual parity.
