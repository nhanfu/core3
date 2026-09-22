# Verification

The Forum answer downvote slice is functionally complete within its bounded
scope. YAML presentation and API fragments remain separated and joined by
`page.id: forum-question-detail`. The action is permissioned by `forum.read`,
requires an authenticated actor, rejects own-answer votes and unavailable
states, protects both parent and answer with optimistic versions, and persists
the unique signed vote relation across restart.

The live Odoo reference blocker and unavailable borrowed tab are recorded in
[`browser-check.md`](browser-check.md); no visual parity or complete-module
sign-off is asserted.
