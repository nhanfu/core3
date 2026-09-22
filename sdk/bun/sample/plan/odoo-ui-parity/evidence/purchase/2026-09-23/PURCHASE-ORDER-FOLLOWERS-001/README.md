# PURCHASE-ORDER-FOLLOWERS-001

Bounded parity slice for Odoo's purchase-order Add/Remove Followers workflow.

Core3 exposes follower subscriptions and candidates through the
`purchase-detail` page/API pair, persists changes with row-version guards, and
records follower changes in Purchase chatter.

This is a conditional bounded pass, not full Purchase or visual parity sign-off.
